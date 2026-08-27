package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"html"
	"log"
	"net/http"
	"strconv"
	"sync/atomic"
	"time"

	"noab-backend/db"
	"noab-backend/middleware"

	"github.com/microcosm-cc/bluemonday"
)

// تنظيف HTML من المدخلات - StrictPolicy تحذف كل العلامات
// ثم نفك ترميز HTML entities (مثل &amp;) لتفادي الترميز المزدوج عند العرض
var sanitizer = bluemonday.StrictPolicy()

func sanitize(s string) string {
	return html.UnescapeString(sanitizer.Sanitize(s))
}

func sanitizePtr(s *string) *string {
	if s == nil {
		return nil
	}
	cleaned := sanitize(*s)
	return &cleaned
}

// logErr يسجّل خطأً مع السياق دون مقاطعة التدفق
func logErr(context string, err error) {
	if err == nil {
		return
	}
	log.Printf("⚠️  %s: %v", context, err)
}

// withTx ينفّذ دالة داخل معاملة SQL، يلتزم تلقائياً عند النجاح ويتراجع عند الفشل
func withTx(fn func(*sql.Tx) error) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return fmt.Errorf("بدء المعاملة فشل: %w", err)
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
	}()
	if err := fn(tx); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			log.Printf("⚠️  فشل تراجع المعاملة: %v (الخطأ الأصلي: %v)", rbErr, err)
		}
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("تثبيت المعاملة فشل: %w", err)
	}
	return nil
}

// مولّد ID آمن من race conditions
var idCounter atomic.Int64

func init() {
	idCounter.Store(time.Now().UnixMilli())
}

func generateID(prefix string) string {
	n := idCounter.Add(1)
	b := make([]byte, 4)
	rand.Read(b)
	return fmt.Sprintf("%s-%d-%x", prefix, n%100000, b)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func getUserID(r *http.Request) int {
	if id, ok := r.Context().Value(middleware.UserIDKey).(int); ok {
		return id
	}
	return 0
}

func getUserRole(r *http.Request) string {
	if role, ok := r.Context().Value(middleware.UserRoleKey).(string); ok {
		return role
	}
	return ""
}

func getQueryInt(r *http.Request, key string, defaultVal int) int {
	val := r.URL.Query().Get(key)
	if val == "" {
		return defaultVal
	}
	i, err := strconv.Atoi(val)
	if err != nil {
		return defaultVal
	}
	// حد أقصى وأدنى للـ pagination
	if key == "limit" && (i > 100 || i < 1) {
		return defaultVal
	}
	if key == "page" && i < 1 {
		return 1
	}
	return i
}

func logActivity(userID int, userName, action string, entityType, entityID *string, details string) {
	_, err := db.DB.Exec(`
		INSERT INTO activity_logs (user_id, user_name, action, entity_type, entity_id, details)
		VALUES (?, ?, ?, ?, ?, ?)
	`, userID, userName, action, entityType, entityID, details)
	logErr("logActivity", err)
}

func createNotification(userID int, title, message, notifType string, entityType, entityID *string) {
	_, err := db.DB.Exec(`
		INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
		VALUES (?, ?, ?, ?, ?, ?)
	`, userID, title, message, notifType, entityType, entityID)
	logErr("createNotification", err)
}

// logActivityTx + createNotificationTx نسخ تعمل داخل معاملة
func logActivityTx(tx *sql.Tx, userID int, userName, action string, entityType, entityID *string, details string) error {
	_, err := tx.Exec(`
		INSERT INTO activity_logs (user_id, user_name, action, entity_type, entity_id, details)
		VALUES (?, ?, ?, ?, ?, ?)
	`, userID, userName, action, entityType, entityID, details)
	if err != nil {
		return fmt.Errorf("logActivityTx: %w", err)
	}
	return nil
}

func createNotificationTx(tx *sql.Tx, userID int, title, message, notifType string, entityType, entityID *string) error {
	_, err := tx.Exec(`
		INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
		VALUES (?, ?, ?, ?, ?, ?)
	`, userID, title, message, notifType, entityType, entityID)
	if err != nil {
		return fmt.Errorf("createNotificationTx: %w", err)
	}
	return nil
}

func strPtr(s string) *string {
	return &s
}

// userDepartmentHandlesRequest يتحقق أن قسم المستخدم من الأقسام المُحالة للطلب.
// يقبل القسم الرئيسي (requests.assigned_department) أو أي قسم في
// جدول request_departments — وهو ما يجعل الإحالة لأكثر من قسم تعمل فعلياً:
// بدونه كان رئيس القسم الثاني يُخطَر بالطلب ثم يُرفض بـ 403.
func userDepartmentHandlesRequest(requestID string, userID int) (bool, string) {
	var userDept sql.NullString
	if err := db.DB.QueryRow(
		"SELECT department_id FROM users WHERE id = ?", userID,
	).Scan(&userDept); err != nil || !userDept.Valid || userDept.String == "" {
		return false, ""
	}

	var primary sql.NullString
	if err := db.DB.QueryRow(
		"SELECT assigned_department FROM requests WHERE id = ?", requestID,
	).Scan(&primary); err != nil {
		return false, userDept.String
	}
	if primary.Valid && primary.String == userDept.String {
		return true, userDept.String
	}

	var n int
	logErr("userDepartmentHandlesRequest junction", db.DB.QueryRow(
		"SELECT COUNT(*) FROM request_departments WHERE request_id = ? AND department_id = ?",
		requestID, userDept.String,
	).Scan(&n))
	return n > 0, userDept.String
}

// =============================================
// تصنيف السرية والجهات الطالبة
// =============================================

// ConfidentialityPublic البحث عام → يُسلَّم للنائب عبر رئيس القسم
// ConfidentialityConfidential البحث ذو خصوصية → يُسلَّم عبر مدير الدائرة
const (
	ConfidentialityPublic       = "public"
	ConfidentialityConfidential = "confidential"
)

// normalizeConfidentiality يقبل القيمة المعروفة فقط ويرجع 'public' لأي شيء آخر
func normalizeConfidentiality(v string) string {
	if v == ConfidentialityConfidential {
		return ConfidentialityConfidential
	}
	return ConfidentialityPublic
}

// RequesterTypes الجهات التي يحق لها تقديم طلب بحثي
// كلها تحمل role='deputy' وتستخدم بوابة تقديم الطلبات نفسها
var RequesterTypes = map[string]bool{
	"deputy":      true, // نائب
	"presidency":  true, // رئاسات
	"committee":   true, // لجان
	"bloc_leader": true, // رؤساء الكتل
	"director":    true, // مدراء
	"advisor":     true, // مستشارين
}

// normalizeRequesterType يرجع 'deputy' لأي قيمة غير معروفة
func normalizeRequesterType(v string) string {
	if RequesterTypes[v] {
		return v
	}
	return "deputy"
}
