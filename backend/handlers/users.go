package handlers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"noab-backend/db"
	"noab-backend/models"

	"golang.org/x/crypto/bcrypt"
)

// GET /api/users
func GetUsers(w http.ResponseWriter, r *http.Request) {
	role := r.URL.Query().Get("role")
	department := r.URL.Query().Get("department")
	page := getQueryInt(r, "page", 1)
	limit := getQueryInt(r, "limit", 50)
	offset := (page - 1) * limit

	query := `SELECT id, name, email, role, department_id, deputy_id, requester_type, committee,
		phone, specialization, status, last_login, created_at
		FROM users WHERE 1=1`
	countQuery := "SELECT COUNT(*) FROM users WHERE 1=1"
	var args []interface{}

	if role != "" {
		query += " AND role = ?"
		countQuery += " AND role = ?"
		args = append(args, role)
	}
	if department != "" {
		query += " AND department_id = ?"
		countQuery += " AND department_id = ?"
		args = append(args, department)
	}

	var total int
	db.DB.QueryRow(countQuery, args...).Scan(&total)

	query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "خطأ في جلب المستخدمين",
		})
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.DepartmentID,
			&u.DeputyID, &u.RequesterType, &u.Committee, &u.Phone, &u.Specialization,
			&u.Status, &u.LastLogin, &u.CreatedAt)
		if err != nil {
			continue
		}
		users = append(users, u)
	}

	writeJSON(w, http.StatusOK, models.PaginatedResponse{
		Success: true, Data: users, Total: total, Page: page, Limit: limit,
	})
}

// GET /api/users/{id}
func GetUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var u models.User
	err := db.DB.QueryRow(`
		SELECT id, name, email, role, department_id, deputy_id, requester_type, committee,
		       phone, specialization, status, last_login, created_at
		FROM users WHERE id = ?
	`, id).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.DepartmentID,
		&u.DeputyID, &u.RequesterType, &u.Committee, &u.Phone, &u.Specialization,
		&u.Status, &u.LastLogin, &u.CreatedAt)

	if err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Message: "المستخدم غير موجود",
		})
		return
	}

	// جلب الصلاحيات
	rows, _ := db.DB.Query(`
		SELECT p.name FROM permissions p
		JOIN user_permissions up ON p.id = up.permission_id
		WHERE up.user_id = ?
	`, id)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var perm string
			if rows.Scan(&perm) == nil {
				u.Permissions = append(u.Permissions, perm)
			}
		}
	}

	// جلب اللجان (للنواب)
	commRows, _ := db.DB.Query(
		"SELECT committee FROM user_committees WHERE user_id = ? ORDER BY is_primary DESC, committee",
		id,
	)
	if commRows != nil {
		defer commRows.Close()
		for commRows.Next() {
			var c string
			if commRows.Scan(&c) == nil {
				u.Committees = append(u.Committees, c)
			}
		}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Data: u})
}

// POST /api/users
func CreateUser(w http.ResponseWriter, r *http.Request) {
	callerRole := getUserRole(r)
	callerID := getUserID(r)

	var input struct {
		Name          string   `json:"name"`
		Email         string   `json:"email"`
		Password      string   `json:"password"`
		Role          string   `json:"role"`
		DepartmentID  *string  `json:"department_id"`
		RequesterType string   `json:"requester_type"` // للجهات الطالبة: نواب/رئاسات/لجان/رؤساء الكتل/مدراء/مستشارين
		Committee     *string  `json:"committee"`      // للنواب (واحدة، للتوافق)
		Committees    []string `json:"committees"`     // للنواب (متعددة) - الأولى = الرئيسية
		Phone         *string  `json:"phone"`          // للنواب (لإرسال SMS)
		Permissions   []string `json:"permissions"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}

	// التحقق من المدخلات
	if input.Name == "" || input.Email == "" || input.Role == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "يرجى ملء الاسم والبريد والدور",
		})
		return
	}

	validRoles := map[string]bool{"deputy": true, "manager": true, "department_head": true, "researcher": true, "proofreader": true, "assistant_manager": true, "admin": true}
	if !validRoles[input.Role] {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "الدور غير صالح",
		})
		return
	}

	// رئيس القسم يمكنه فقط إنشاء باحث أو مدقق في قسمه
	if callerRole == "department_head" {
		if input.Role != "researcher" && input.Role != "proofreader" {
			writeJSON(w, http.StatusForbidden, models.APIResponse{
				Success: false, Message: "يمكنك فقط إنشاء حسابات باحثين ومدققين",
			})
			return
		}
		// تعيين القسم تلقائياً من قسم رئيس القسم
		var deptID string
		db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", callerID).Scan(&deptID)
		input.DepartmentID = &deptID
	}

	// كلمة المرور - يجب تحديدها
	password := input.Password
	if password == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "يرجى تحديد كلمة المرور",
		})
		return
	}
	if msg := validatePassword(password); msg != "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: msg})
		return
	}
	passwordHash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	// توحيد قائمة اللجان: من input.Committees أو input.Committee (واحدة)
	committees := input.Committees
	if len(committees) == 0 && input.Committee != nil && *input.Committee != "" {
		committees = []string{*input.Committee}
	}
	// اللجنة الأولى تُعتبَر "الرئيسية" وتُخزَّن في users.committee للتوافق
	var primaryCommittee *string
	if len(committees) > 0 {
		c := sanitize(committees[0])
		primaryCommittee = &c
	}

	// نوع الجهة الطالبة يخص الأدوار الطالبة فقط (role='deputy')
	requesterType := normalizeRequesterType(input.RequesterType)

	result, err := db.DB.Exec(`
		INSERT INTO users (name, email, password_hash, role, department_id, requester_type, committee, phone, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
	`, sanitize(input.Name), sanitize(input.Email), passwordHash, input.Role,
		input.DepartmentID, requesterType, primaryCommittee, sanitizePtr(input.Phone))

	if isUniqueViolation(err) {
		// تكرار البريد خطأ عميل لا عطل خادم
		writeJSON(w, http.StatusConflict, models.APIResponse{
			Success: false, Message: "البريد الإلكتروني مستخدم سلفاً",
		})
		return
	}
	if err != nil {
		log.Printf("CreateUser INSERT failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل إنشاء المستخدم",
		})
		return
	}

	userID, _ := result.LastInsertId()

	// إدخال كل اللجان في user_committees
	for i, c := range committees {
		c = sanitize(c)
		if c == "" {
			continue
		}
		isPrimary := 0
		if i == 0 {
			isPrimary = 1
		}
		_, err := db.DB.Exec(
			"INSERT OR IGNORE INTO user_committees (user_id, committee, is_primary) VALUES (?, ?, ?)",
			userID, c, isPrimary,
		)
		logErr("INSERT user_committee", err)
	}

	// إضافة الصلاحيات
	for _, perm := range input.Permissions {
		db.DB.Exec(`
			INSERT OR IGNORE INTO user_permissions (user_id, permission_id)
			SELECT ?, id FROM permissions WHERE name = ?
		`, userID, perm)
	}

	adminID := getUserID(r)
	var adminName string
	db.DB.QueryRow("SELECT name FROM users WHERE id = ?", adminID).Scan(&adminName)
	logActivityIP(r, adminID, adminName, "create_user", strPtr("user"), nil, "إنشاء مستخدم جديد: "+input.Name)

	writeJSON(w, http.StatusCreated, models.APIResponse{
		Success: true, Message: "تم إنشاء المستخدم بنجاح",
		Data: map[string]int64{"id": userID},
	})
}

// PUT /api/users/{id}/status
func UpdateUserStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	callerRole := getUserRole(r)
	callerID := getUserID(r)

	var input struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}

	// التحقق من القيم المسموحة
	if input.Status != "active" && input.Status != "inactive" && input.Status != "suspended" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "حالة غير صالحة",
		})
		return
	}

	// رئيس القسم يمكنه فقط تعديل موظفي قسمه
	if callerRole == "department_head" {
		var callerDept, targetDept *string
		db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", callerID).Scan(&callerDept)
		db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", id).Scan(&targetDept)
		if callerDept == nil || targetDept == nil || *callerDept != *targetDept {
			writeJSON(w, http.StatusForbidden, models.APIResponse{
				Success: false, Message: "يمكنك فقط تعديل حالة موظفي قسمك",
			})
			return
		}
	}

	_, err := db.DB.Exec("UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		input.Status, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل تحديث حالة المستخدم",
		})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Message: "تم تحديث حالة المستخدم",
	})
}

// POST /api/users/bulk - إنشاء عدة حسابات نواب دفعة واحدة (admin only)
// يولِّد كلمات مرور عشوائية ويُرجع البيانات للأدمن لتوزيعها
func BulkCreateUsers(w http.ResponseWriter, r *http.Request) {
	adminID := getUserID(r)

	var input models.BulkUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "بيانات غير صالحة"})
		return
	}
	if len(input.Users) == 0 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "لا توجد مستخدمين للإنشاء"})
		return
	}
	if len(input.Users) > 500 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "الحد الأقصى 500 مستخدم في الدفعة الواحدة"})
		return
	}

	validRoles := map[string]bool{"deputy": true, "manager": true, "department_head": true, "researcher": true, "proofreader": true, "assistant_manager": true, "admin": true}
	results := make([]models.BulkUserResult, 0, len(input.Users))
	successCount := 0

	var adminName string
	db.DB.QueryRow("SELECT name FROM users WHERE id = ?", adminID).Scan(&adminName)

	for i, u := range input.Users {
		res := models.BulkUserResult{Name: u.Name}

		// تنظيف وتحقق
		u.Name = sanitize(u.Name)
		u.Email = sanitize(u.Email)
		role := u.Role
		if role == "" {
			role = "deputy"
		}
		if !validRoles[role] {
			res.Error = "الدور غير صالح: " + role
			results = append(results, res)
			continue
		}
		if u.Name == "" {
			res.Error = "الاسم مطلوب"
			results = append(results, res)
			continue
		}

		// توليد بريد إن لم يُذكر: deputy{رقم تسلسلي}@parliament.iq
		if u.Email == "" {
			u.Email = fmt.Sprintf("%s%d.t%d@parliament.iq", role, time.Now().Unix()%10000, i+1)
		}
		res.Email = u.Email

		// توليد كلمة مرور عشوائية (10 أحرف من مجموعة آمنة، بدون أحرف ملتبسة)
		pwd := generateReadablePassword(12)
		hashed, err := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
		if err != nil {
			res.Error = "فشل تشفير كلمة المرور"
			results = append(results, res)
			continue
		}

		// تحديد اللجنة الرئيسية
		var primaryCommittee *string
		if len(u.Committees) > 0 {
			c := sanitize(u.Committees[0])
			primaryCommittee = &c
		}

		// إدخال المستخدم
		result, err := db.DB.Exec(`
			INSERT INTO users (name, email, password_hash, role, requester_type, committee, phone, deputy_id, status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
		`, u.Name, u.Email, hashed, role, normalizeRequesterType(u.RequesterType),
			primaryCommittee, sanitize(u.Phone), sanitize(u.DeputyID))
		if err != nil {
			res.Error = "البريد قد يكون مكرراً: " + err.Error()
			results = append(results, res)
			continue
		}
		userID, _ := result.LastInsertId()

		// إدخال كل اللجان في junction table
		for j, c := range u.Committees {
			c = sanitize(c)
			if c == "" {
				continue
			}
			isPrimary := 0
			if j == 0 {
				isPrimary = 1
			}
			_, err := db.DB.Exec(
				"INSERT OR IGNORE INTO user_committees (user_id, committee, is_primary) VALUES (?, ?, ?)",
				userID, c, isPrimary,
			)
			logErr("BulkCreate user_committees", err)
		}

		// إضافة الصلاحيات الافتراضية حسب الدور
		permsMap := map[string][]string{
			"deputy":            {"submit_request", "view_own_requests"},
			"researcher":        {"view_assigned", "submit_research", "request_info"},
			"proofreader":       {"proofread", "edit_research"},
			"department_head":   {"manage_requests", "assign_researchers", "view_department", "confirm_request"},
			"manager":           {"view_all_requests", "manage_requests", "assign_department", "view_reports"},
			"assistant_manager": {"assistant_final_review", "view_all_requests"},
		}
		for _, perm := range permsMap[role] {
			db.DB.Exec(`INSERT OR IGNORE INTO user_permissions (user_id, permission_id) SELECT ?, id FROM permissions WHERE name = ?`, userID, perm)
		}

		res.Success = true
		res.UserID = int(userID)
		res.Password = pwd
		results = append(results, res)
		successCount++
	}

	logActivityIP(r, adminID, adminName, "bulk_create_users", strPtr("user"), nil,
		fmt.Sprintf("إنشاء %d مستخدم بدفعة واحدة (%d ناجح من %d)", successCount, successCount, len(input.Users)))

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Message: fmt.Sprintf("تم إنشاء %d حساب من أصل %d", successCount, len(input.Users)),
		Data:    results,
	})
}

// generateReadablePassword يولِّد كلمة مرور سهلة القراءة (بدون O/0 أو I/l/1)
func generateReadablePassword(length int) string {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
	b := make([]byte, length)
	for i := range b {
		n := make([]byte, 1)
		_, _ = rand.Read(n)
		b[i] = charset[int(n[0])%len(charset)]
	}
	return string(b)
}

// PUT /api/users/{id}/reset-password - الأدمن يعيد تعيين كلمة مرور أي مستخدم
// (admin only - لا يحتاج كلمة المرور القديمة)
func AdminResetPassword(w http.ResponseWriter, r *http.Request) {
	targetID := r.PathValue("id")
	adminID := getUserID(r)

	var input struct {
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "بيانات غير صالحة"})
		return
	}
	if msg := validatePassword(input.NewPassword); msg != "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: msg})
		return
	}

	// التأكد أن المستخدم المستهدف موجود
	var targetName, targetEmail string
	if err := db.DB.QueryRow("SELECT name, email FROM users WHERE id = ?", targetID).Scan(&targetName, &targetEmail); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "المستخدم غير موجود"})
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "خطأ في تشفير كلمة المرور"})
		return
	}

	if _, err := db.DB.Exec(
		"UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		string(newHash), targetID,
	); err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل تحديث كلمة المرور"})
		return
	}

	// تسجيل النشاط
	var adminName string
	db.DB.QueryRow("SELECT name FROM users WHERE id = ?", adminID).Scan(&adminName)
	logActivityIP(r, adminID, adminName, "admin_reset_password", strPtr("user"), &targetID,
		"إعادة تعيين كلمة مرور المستخدم: "+targetName+" ("+targetEmail+")")

	// إشعار المستخدم المتأثر
	tid, _ := strconv.Atoi(targetID)
	if tid > 0 {
		createNotification(tid, "تم إعادة تعيين كلمة مرورك",
			"قام مدير النظام بإعادة تعيين كلمة المرور الخاصة بك. يرجى تسجيل الدخول واستخدام كلمة المرور الجديدة.",
			"warning", nil, nil)
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Message: "تم إعادة تعيين كلمة المرور بنجاح",
	})
}
