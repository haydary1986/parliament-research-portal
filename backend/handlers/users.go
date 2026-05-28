package handlers

import (
	"encoding/json"
	"net/http"

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

	query := `SELECT id, name, email, role, department_id, deputy_id, committee,
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
			&u.DeputyID, &u.Committee, &u.Phone, &u.Specialization,
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
		SELECT id, name, email, role, department_id, deputy_id, committee,
		       phone, specialization, status, last_login, created_at
		FROM users WHERE id = ?
	`, id).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.DepartmentID,
		&u.DeputyID, &u.Committee, &u.Phone, &u.Specialization,
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

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Data: u})
}

// POST /api/users
func CreateUser(w http.ResponseWriter, r *http.Request) {
	callerRole := getUserRole(r)
	callerID := getUserID(r)

	var input struct {
		Name         string   `json:"name"`
		Email        string   `json:"email"`
		Password     string   `json:"password"`
		Role         string   `json:"role"`
		DepartmentID *string  `json:"department_id"`
		Committee    *string  `json:"committee"` // للنواب
		Phone        *string  `json:"phone"`     // للنواب (لإرسال SMS)
		Permissions  []string `json:"permissions"`
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
	if len(password) < 6 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
		})
		return
	}
	passwordHash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	result, err := db.DB.Exec(`
		INSERT INTO users (name, email, password_hash, role, department_id, committee, phone, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
	`, sanitize(input.Name), sanitize(input.Email), passwordHash, input.Role,
		input.DepartmentID, sanitizePtr(input.Committee), sanitizePtr(input.Phone))

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل إنشاء المستخدم - قد يكون البريد مكرراً",
		})
		return
	}

	userID, _ := result.LastInsertId()

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
	logActivity(adminID, adminName, "create_user", strPtr("user"), nil, "إنشاء مستخدم جديد: "+input.Name)

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
