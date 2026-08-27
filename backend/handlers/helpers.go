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
	"strings"
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

// currentIP يستخرج عنوان العميل من سياق الطلب.
// خلف Cloudflare/Traefik يكون RemoteAddr هو الوسيط، فنقدّم الترويسات الموثوقة.
func currentIP(r *http.Request) string {
	if r == nil {
		return ""
	}
	if v := r.Header.Get("CF-Connecting-IP"); v != "" {
		return v
	}
	if v := r.Header.Get("X-Real-IP"); v != "" {
		return v
	}
	if v := r.Header.Get("X-Forwarded-For"); v != "" {
		// أول عنوان في السلسلة هو العميل الأصلي
		if i := strings.Index(v, ","); i > 0 {
			return strings.TrimSpace(v[:i])
		}
		return strings.TrimSpace(v)
	}
	return middleware.ExtractIP(r.RemoteAddr)
}

func logActivity(userID int, userName, action string, entityType, entityID *string, details string) {
	logActivityIP(nil, userID, userName, action, entityType, entityID, details)
}

// logActivityIP يسجّل النشاط مع عنوان العميل.
// عمود ip_address كان يبقى فارغاً دائماً قبل هذا — وهو مطلب تدقيقي أساسي.
func logActivityIP(r *http.Request, userID int, userName, action string, entityType, entityID *string, details string) {
	var ip *string
	if s := currentIP(r); s != "" {
		ip = &s
	}
	_, err := db.DB.Exec(`
		INSERT INTO activity_logs (user_id, user_name, action, entity_type, entity_id, details, ip_address)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, userID, userName, action, entityType, entityID, details, ip)
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
func logActivityTx(tx *sql.Tx, r *http.Request, userID int, userName, action string, entityType, entityID *string, details string) error {
	var ip *string
	if s := currentIP(r); s != "" {
		ip = &s
	}
	_, err := tx.Exec(`
		INSERT INTO activity_logs (user_id, user_name, action, entity_type, entity_id, details, ip_address)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, userID, userName, action, entityType, entityID, details, ip)
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

// canAccessRequest يحدد ما إذا كان للمستخدم حق قراءة طلب ومرفقاته.
// مصدر حقيقة واحد يستخدمه GetRequest وServeFile معاً.
//
//	admin / manager / assistant_manager → كل الطلبات (أدوار إشرافية)
//	deputy            → طلباته فقط
//	department_head   → طلبات الأقسام المُحالة إليه
//	researcher        → الطلبات التي له عليها مهمة
//	proofreader       → الطلبات التي له عليها مهمة تدقيق
func canAccessRequest(requestID string, userID int, role string) bool {
	switch role {
	case "admin", "manager", "assistant_manager":
		return true

	case "deputy":
		var owner sql.NullInt64
		if err := db.DB.QueryRow("SELECT deputy_id FROM requests WHERE id = ?", requestID).Scan(&owner); err != nil {
			return false
		}
		return owner.Valid && int(owner.Int64) == userID

	case "department_head":
		allowed, _ := userDepartmentHandlesRequest(requestID, userID)
		return allowed

	case "researcher":
		var n int
		logErr("canAccessRequest researcher", db.DB.QueryRow(
			"SELECT COUNT(*) FROM research_tasks WHERE request_id = ? AND researcher_id = ?",
			requestID, userID,
		).Scan(&n))
		return n > 0

	case "proofreader":
		var n int
		logErr("canAccessRequest proofreader", db.DB.QueryRow(`
			SELECT COUNT(*) FROM proofreading_tasks pt
			JOIN research_tasks rt ON rt.id = pt.research_task_id
			WHERE rt.request_id = ? AND pt.proofreader_id = ?
		`, requestID, userID).Scan(&n))
		return n > 0
	}
	return false
}

// requestIDForFile يرجع معرّف الطلب الذي ينتمي إليه ملف مرفوع.
// يبحث في مهام البحث ومهام التدقيق معاً.
func requestIDForFile(filename string) (string, bool) {
	var reqID string
	err := db.DB.QueryRow(
		"SELECT request_id FROM research_tasks WHERE file_path = ? LIMIT 1", filename,
	).Scan(&reqID)
	if err == nil {
		return reqID, true
	}
	err = db.DB.QueryRow(`
		SELECT rt.request_id FROM proofreading_tasks pt
		JOIN research_tasks rt ON rt.id = pt.research_task_id
		WHERE pt.file_path = ? LIMIT 1
	`, filename).Scan(&reqID)
	if err == nil {
		return reqID, true
	}
	return "", false
}

// =============================================
// سياسة كلمات المرور
// =============================================

// MinPasswordLength الحد الأدنى لطول كلمة المرور.
// رُفع من 6 إلى 10 — ستة أحرف بلا تعقيد قابلة للتخمين على منصة حكومية.
const MinPasswordLength = 10

// validatePassword يتحقق من الطول والتنوّع.
// يرجع رسالة عربية عند الفشل، أو "" عند القبول.
func validatePassword(pw string) string {
	if len([]rune(pw)) < MinPasswordLength {
		return fmt.Sprintf("كلمة المرور يجب أن تكون %d أحرف على الأقل", MinPasswordLength)
	}
	var hasLetter, hasDigit bool
	for _, c := range pw {
		switch {
		case c >= '0' && c <= '9':
			hasDigit = true
		case (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'):
			hasLetter = true
		}
	}
	if !hasLetter || !hasDigit {
		return "كلمة المرور يجب أن تجمع بين حروف وأرقام"
	}
	// كلمات شائعة صريحة
	weak := map[string]bool{
		"password12": true, "1234567890": true, "0123456789": true,
		"parliament": true, "iraq123456": true, "admin12345": true,
	}
	if weak[strings.ToLower(pw)] {
		return "كلمة المرور شائعة جداً — اختر أخرى"
	}
	return ""
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

// أنواع الخدمة والتصنيفات — مطابقة لقيود CHECK على request_confirmations.
// كانت تُفحص للفراغ فقط ثم تُمرَّر للقاعدة، فأي قيمة أخرى تُفجّر القيد
// داخل INSERT ويعود 500 «فشل إحالة الطلب» بلا بيان السبب.
var ServiceTypes = map[string]bool{
	"دراسة": true, "تقرير": true, "ورقة إحاطة": true,
	"بيان رأي": true, "سؤال نيابي": true,
}

var Classifications = map[string]bool{
	"علمي": true, "اجتماعي": true, "سياسي": true,
	"قانوني": true, "مالية واقتصادية": true,
}

// validateConfirmation يتحقّق من نوع الخدمة والتصنيف ومدة الإنجاز.
// يرجع رسالة الخطأ، أو "" إن كانت المدخلات صحيحة.
func validateConfirmation(serviceType, classification string, days int) string {
	if !ServiceTypes[serviceType] {
		return "نوع الخدمة غير معتمد"
	}
	if !Classifications[classification] {
		return "التصنيف غير معتمد"
	}
	if days < 1 || days > 365 {
		return "مدة الإنجاز يجب أن تكون بين يوم و365 يوماً"
	}
	return ""
}

// أغراض الطلب — مطابقة لقيد CHECK على عمود requests.purpose.
// كان الحقل يُمرَّر للقاعدة بلا تحقّق، فتنفجر قيود CHECK داخل INSERT
// ويعود 500 غامض بدل 400 برسالة مفهومة.
var RequestPurposes = map[string]bool{
	"oversight":   true, // رقابي
	"legislative": true, // تشريعي
	"other":       true, // أخرى
}

// normalizePurpose يرجع القيمة المعتمدة، و ok=false لقيمة غير معروفة.
// الحقل الفارغ يُعامَل كـ "other" لأنه اختياري في نموذج التقديم.
func normalizePurpose(v string) (string, bool) {
	v = strings.TrimSpace(v)
	if v == "" {
		return "other", true
	}
	if RequestPurposes[v] {
		return v, true
	}
	return "", false
}

// اللجان النيابية الرسمية بعد تعديل النظام الداخلي (req.md — بوابة النواب ن1).
// كانت القائمة مطبَّقة في الواجهة فقط، والخادم يقبل أي نص ويخزّنه —
// فتتلوّث تقارير التوزيع حسب اللجنة.
var OfficialCommittees = map[string]bool{
	"اللجنة القانونية":                true,
	"لجنة العلاقات الخارجية":          true,
	"لجنة الخدمات والإعمار":           true,
	"لجنة الاقتصاد والتجارة والصناعة": true,
	"لجنة الاستثمار والتنمية":         true,
	"لجنة الأقاليم والمحافظات غير المنتظمة بإقليم والتخطيط الستراتيجي والبرنامج الحكومي والأوقاف": true,
	"لجنة الصحة ومكافحة المخدرات والمؤثرات العقلية":                                               true,
	"لجنة التعليم العالي والبحث العلمي":                                                           true,
	"لجنة التربية": true,
	"لجنة العمل ومؤسسات المجتمع المدني والخدمة العامة الاتحادية والشباب والرياضة": true,
	"لجنة النقل والاتصالات والحوكمة":                                              true,
	"لجنة المنافذ الحدودية وحماية المنتج الوطني":                                  true,
	"لجنة السلوك النيابي":                                                         true,
	"لجنة الزراعة والموارد المائية والأهوار والبيئة":                              true,
	"لجنة الكهرباء والطاقة":                                                       true,
	"لجنة الشهداء والضحايا والسجناء السياسيين":                                    true,
	"اللجنة المالية":                                                              true,
	"لجنة النزاهة":                                                                true,
	"لجنة الأمن والدفاع":                                                          true,
	"لجنة النفط والغاز والثروات الطبيعية":                                         true,
	"لجنة حقوق الإنسان":                                                           true,
	"لجنة الهجرة والمهجرين والمصالحة المجتمعية":                                   true,
	"لجنة الثقافة والسياحة والآثار والإعلام":                                      true,
	"أخرى": true,
}

// validateCommittees يتحقّق من قائمة لجان مفصولة بفاصلة عربية (صيغة الواجهة).
// يرجع اللجنة غير المعتمدة الأولى، أو "" إن كانت كلها صحيحة.
func validateCommittees(v string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return ""
	}
	for _, part := range strings.Split(v, "،") {
		name := strings.TrimSpace(part)
		if name == "" {
			continue
		}
		if !OfficialCommittees[name] {
			return name
		}
	}
	return ""
}

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
