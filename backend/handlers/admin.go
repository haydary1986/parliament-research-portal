package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"noab-backend/db"
	"noab-backend/models"
)

// =============================================
// تعديل المستخدمين
// =============================================

// PUT /api/users/{id} - تعديل بيانات مستخدم (أدمن)
// الحذف غير مدعوم عمداً: سجلات النشاط والطلبات تشير إلى المستخدم،
// والتعطيل عبر /status هو البديل الحافظ لسلامة السجل.
func UpdateUser(w http.ResponseWriter, r *http.Request) {
	targetID := r.PathValue("id")
	adminID := getUserID(r)

	var input struct {
		Name           string   `json:"name"`
		Email          string   `json:"email"`
		DepartmentID   *string  `json:"department_id"`
		RequesterType  string   `json:"requester_type"`
		Committees     []string `json:"committees"`
		Phone          *string  `json:"phone"`
		Specialization *string  `json:"specialization"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "بيانات غير صالحة"})
		return
	}

	var cur models.User
	var curDept, curPhone, curSpec sql.NullString
	if err := db.DB.QueryRow(
		"SELECT name, email, role, department_id, phone, specialization FROM users WHERE id = ?", targetID,
	).Scan(&cur.Name, &cur.Email, &cur.Role, &curDept, &curPhone, &curSpec); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "المستخدم غير موجود"})
		return
	}

	name := sanitize(input.Name)
	if name == "" {
		name = cur.Name
	}
	email := sanitize(input.Email)
	if email == "" {
		email = cur.Email
	}

	deptID := curDept
	if input.DepartmentID != nil {
		if *input.DepartmentID == "" {
			deptID = sql.NullString{}
		} else {
			deptID = sql.NullString{String: *input.DepartmentID, Valid: true}
		}
	}

	phone := curPhone
	if input.Phone != nil {
		phone = sql.NullString{String: sanitize(*input.Phone), Valid: *input.Phone != ""}
	}
	spec := curSpec
	if input.Specialization != nil {
		spec = sql.NullString{String: sanitize(*input.Specialization), Valid: *input.Specialization != ""}
	}

	// اللجان تُحدَّث فقط عند إرسالها صراحةً
	updateCommittees := input.Committees != nil
	var primaryCommittee *string
	if updateCommittees && len(input.Committees) > 0 {
		c := sanitize(input.Committees[0])
		primaryCommittee = &c
	}

	requesterType := normalizeRequesterType(input.RequesterType)

	var adminName string
	logErr("UpdateUser adminName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", adminID).Scan(&adminName))

	txErr := withTx(func(tx *sql.Tx) error {
		if _, err := tx.Exec(`
			UPDATE users SET name = ?, email = ?, department_id = ?, requester_type = ?,
			       phone = ?, specialization = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ?
		`, name, email, deptID, requesterType, phone, spec, targetID); err != nil {
			return fmt.Errorf("UPDATE user: %w", err)
		}

		if updateCommittees {
			if _, err := tx.Exec("DELETE FROM user_committees WHERE user_id = ?", targetID); err != nil {
				return fmt.Errorf("clear committees: %w", err)
			}
			for i, c := range input.Committees {
				c = sanitize(c)
				if c == "" {
					continue
				}
				isPrimary := 0
				if i == 0 {
					isPrimary = 1
				}
				if _, err := tx.Exec(
					"INSERT OR IGNORE INTO user_committees (user_id, committee, is_primary) VALUES (?, ?, ?)",
					targetID, c, isPrimary,
				); err != nil {
					return fmt.Errorf("INSERT committee: %w", err)
				}
			}
			if primaryCommittee != nil {
				if _, err := tx.Exec("UPDATE users SET committee = ? WHERE id = ?", *primaryCommittee, targetID); err != nil {
					return fmt.Errorf("UPDATE primary committee: %w", err)
				}
			}
		}

		return logActivityTx(tx, r, adminID, adminName, "update_user", strPtr("user"), &targetID,
			"تعديل بيانات المستخدم: "+name)
	})

	if txErr != nil {
		log.Printf("UpdateUser tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل تعديل المستخدم — قد يكون البريد مستخدماً",
		})
		return
	}

	// إشعار المستخدم المتأثر
	if tid, err := strconv.Atoi(targetID); err == nil && tid > 0 {
		createNotification(tid, "تم تحديث بياناتك",
			"قام مدير النظام بتحديث بيانات حسابك.", "info", nil, nil)
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم تعديل بيانات المستخدم"})
}

// =============================================
// إدارة الأقسام
// =============================================

// POST /api/departments - إنشاء قسم (أدمن)
func CreateDepartment(w http.ResponseWriter, r *http.Request) {
	adminID := getUserID(r)

	var input struct {
		ID       string `json:"id"`
		Name     string `json:"name"`
		HeadName string `json:"head_name"`
		Color    string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "بيانات غير صالحة"})
		return
	}

	input.ID = sanitize(input.ID)
	input.Name = sanitize(input.Name)
	if input.ID == "" || input.Name == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "معرّف القسم واسمه مطلوبان",
		})
		return
	}
	if !isSlug(input.ID) {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "معرّف القسم يقبل الحروف اللاتينية الصغيرة والأرقام والشرطة السفلية فقط",
		})
		return
	}
	color := sanitize(input.Color)
	if color == "" {
		color = "#0A2540"
	}

	if _, err := db.DB.Exec(
		"INSERT INTO departments (id, name, head_name, color) VALUES (?, ?, ?, ?)",
		input.ID, input.Name, sanitize(input.HeadName), color,
	); err != nil {
		// معرّف مستخدَم سلفاً خطأ عميل لا عطل خادم
		if isUniqueViolation(err) {
			writeJSON(w, http.StatusConflict, models.APIResponse{
				Success: false, Message: "معرّف القسم مستخدم سلفاً",
			})
			return
		}
		log.Printf("CreateDepartment INSERT failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل إنشاء القسم",
		})
		return
	}

	var adminName string
	logErr("CreateDepartment adminName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", adminID).Scan(&adminName))
	logActivityIP(r, adminID, adminName, "create_department", strPtr("department"), &input.ID, "إنشاء قسم: "+input.Name)

	writeJSON(w, http.StatusCreated, models.APIResponse{
		Success: true, Message: "تم إنشاء القسم", Data: map[string]string{"id": input.ID},
	})
}

// PUT /api/departments/{id} - تعديل قسم (أدمن)
func UpdateDepartment(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	adminID := getUserID(r)

	var input struct {
		Name     string `json:"name"`
		HeadName string `json:"head_name"`
		Color    string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "بيانات غير صالحة"})
		return
	}

	var cur models.Department
	if err := db.DB.QueryRow(
		"SELECT name, head_name, color FROM departments WHERE id = ?", id,
	).Scan(&cur.Name, &cur.HeadName, &cur.Color); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "القسم غير موجود"})
		return
	}

	name := sanitize(input.Name)
	if name == "" {
		name = cur.Name
	}
	head := sanitize(input.HeadName)
	if head == "" {
		head = cur.HeadName
	}
	color := sanitize(input.Color)
	if color == "" {
		color = cur.Color
	}

	if _, err := db.DB.Exec(
		"UPDATE departments SET name = ?, head_name = ?, color = ? WHERE id = ?",
		name, head, color, id,
	); err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل تعديل القسم"})
		return
	}

	var adminName string
	logErr("UpdateDepartment adminName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", adminID).Scan(&adminName))
	logActivityIP(r, adminID, adminName, "update_department", strPtr("department"), &id, "تعديل قسم: "+name)

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم تعديل القسم"})
}

// DELETE /api/departments/{id} - حذف قسم فارغ (أدمن)
// يُرفض الحذف إن كان للقسم مستخدمون أو طلبات — حفاظاً على سلامة السجل
func DeleteDepartment(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	adminID := getUserID(r)

	var users, requests, referrals int
	logErr("DeleteDepartment users", db.DB.QueryRow(
		"SELECT COUNT(*) FROM users WHERE department_id = ?", id).Scan(&users))
	logErr("DeleteDepartment requests", db.DB.QueryRow(
		"SELECT COUNT(*) FROM requests WHERE assigned_department = ?", id).Scan(&requests))
	// جدول الإحالة متعددة الأقسام: القسم قد يكون هدفاً ثانوياً لطلب مفتوح.
	// بدون هذا الفحص كان الحذف يسري ثم يُسقط ON DELETE CASCADE صفَّ الإحالة،
	// فيفقد رئيس القسم الوصول لطلبٍ يعمل عليه بلا أثر واضح.
	logErr("DeleteDepartment referrals", db.DB.QueryRow(
		"SELECT COUNT(*) FROM request_departments WHERE department_id = ?", id).Scan(&referrals))

	if users > 0 || requests > 0 || referrals > 0 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: fmt.Sprintf("لا يمكن حذف القسم: مرتبط بـ %d مستخدم و %d طلب و %d إحالة", users, requests, referrals),
		})
		return
	}

	res, err := db.DB.Exec("DELETE FROM departments WHERE id = ?", id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل حذف القسم"})
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "القسم غير موجود"})
		return
	}

	var adminName string
	logErr("DeleteDepartment adminName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", adminID).Scan(&adminName))
	logActivityIP(r, adminID, adminName, "delete_department", strPtr("department"), &id, "حذف قسم")

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم حذف القسم"})
}

// isSlug يتحقق أن المعرّف صالح كمفتاح: حروف لاتينية صغيرة وأرقام وشرطة سفلية
func isSlug(s string) bool {
	if s == "" || len(s) > 40 {
		return false
	}
	for _, c := range s {
		if (c < 'a' || c > 'z') && (c < '0' || c > '9') && c != '_' {
			return false
		}
	}
	return true
}
