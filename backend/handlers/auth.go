package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"noab-backend/db"
	"noab-backend/middleware"
	"noab-backend/models"

	"golang.org/x/crypto/bcrypt"
)

func Login(w http.ResponseWriter, r *http.Request) {
	var input models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}

	// التحقق من المدخلات
	if input.Email == "" || input.Password == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "يرجى إدخال البريد وكلمة المرور",
		})
		return
	}

	var user models.User
	var passwordHash string
	var deptID *string
	err := db.DB.QueryRow(`
		SELECT id, name, email, password_hash, role, department_id, deputy_id,
		       committee, phone, specialization, status
		FROM users WHERE email = ? AND status = 'active'
	`, input.Email).Scan(
		&user.ID, &user.Name, &user.Email, &passwordHash, &user.Role,
		&deptID, &user.DeputyID, &user.Committee, &user.Phone,
		&user.Specialization, &user.Status,
	)

	if err != nil {
		writeJSON(w, http.StatusUnauthorized, models.APIResponse{
			Success: false, Message: "بيانات الدخول غير صحيحة",
		})
		return
	}

	user.DepartmentID = deptID

	// التحقق من كلمة المرور عبر bcrypt فقط
	err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(input.Password))
	if err != nil {
		middleware.RecordLoginAttempt(middleware.ExtractIP(r.RemoteAddr), false)
		writeJSON(w, http.StatusUnauthorized, models.APIResponse{
			Success: false, Message: "بيانات الدخول غير صحيحة",
		})
		return
	}

	// نجاح - إلغاء Rate limit
	middleware.RecordLoginAttempt(r.RemoteAddr, true)

	// تحديث آخر تسجيل دخول
	db.DB.Exec("UPDATE users SET last_login = ? WHERE id = ?", time.Now(), user.ID)

	// جلب الصلاحيات
	rows, err := db.DB.Query(`
		SELECT p.name FROM permissions p
		JOIN user_permissions up ON p.id = up.permission_id
		WHERE up.user_id = ?
	`, user.ID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var perm string
			if rows.Scan(&perm) == nil {
				user.Permissions = append(user.Permissions, perm)
			}
		}
	}

	// تسجيل النشاط
	logActivity(user.ID, user.Name, "login", nil, nil, "تسجيل دخول")

	// توليد JWT
	dept := ""
	if deptID != nil {
		dept = *deptID
	}
	token, err := middleware.GenerateToken(user.ID, user.Role, dept)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "خطأ في إنشاء الجلسة",
		})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Message: "تم تسجيل الدخول بنجاح",
		Data: models.LoginResponse{
			Token: token,
			User:  user,
		},
	})
}

// تسجيل الخروج - إضافة Token للقائمة السوداء
func Logout(w http.ResponseWriter, r *http.Request) {
	tokenStr, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || tokenStr == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "لا يوجد جلسة نشطة",
		})
		return
	}

	// إضافة Token للقائمة السوداء (ينتهي بعد 8 ساعات)
	middleware.BlacklistToken(tokenStr, time.Now().Add(8*time.Hour))

	userID := getUserID(r)
	var userName string
	db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName)
	logActivity(userID, userName, "logout", nil, nil, "تسجيل خروج")

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Message: "تم تسجيل الخروج بنجاح",
	})
}

// إحصائيات الأمان (للأدمن فقط)
func GetSecurityStats(w http.ResponseWriter, r *http.Request) {
	stats := middleware.GetSecurityStats()
	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Data: stats,
	})
}

// تغيير كلمة المرور
func ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)

	var input struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}

	if len(input.NewPassword) < 6 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
		})
		return
	}

	// جلب كلمة المرور الحالية
	var currentHash string
	db.DB.QueryRow("SELECT password_hash FROM users WHERE id = ?", userID).Scan(&currentHash)

	// التحقق من كلمة المرور القديمة
	err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(input.OldPassword))
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, models.APIResponse{
			Success: false, Message: "كلمة المرور الحالية غير صحيحة",
		})
		return
	}

	// تحديث كلمة المرور
	newHash, _ := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	db.DB.Exec("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", string(newHash), userID)

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Message: "تم تغيير كلمة المرور بنجاح",
	})
}
