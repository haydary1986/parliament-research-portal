package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"noab-backend/db"
	"noab-backend/models"
)

// GET /api/requests
func GetRequests(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	role := getUserRole(r)
	status := r.URL.Query().Get("status")
	department := r.URL.Query().Get("department")
	page := getQueryInt(r, "page", 1)
	limit := getQueryInt(r, "limit", 20)
	offset := (page - 1) * limit

	query := `SELECT r.id, r.title, r.description, r.deputy_id, r.deputy_name,
		r.committee, r.purpose, r.phone, r.email, r.status,
		r.assigned_department, r.date_received, r.deadline,
		r.referral_date, r.completed_date, r.created_at, r.updated_at
		FROM requests r WHERE 1=1`
	countQuery := "SELECT COUNT(*) FROM requests r WHERE 1=1"
	var args []interface{}

	// فلترة حسب الدور
	switch role {
	case "deputy":
		query += " AND r.deputy_id = ?"
		countQuery += " AND r.deputy_id = ?"
		args = append(args, userID)
	case "department_head":
		var deptID string
		db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", userID).Scan(&deptID)
		query += " AND r.assigned_department = ?"
		countQuery += " AND r.assigned_department = ?"
		args = append(args, deptID)
	}

	if status != "" {
		query += " AND r.status = ?"
		countQuery += " AND r.status = ?"
		args = append(args, status)
	}
	if department != "" {
		query += " AND r.assigned_department = ?"
		countQuery += " AND r.assigned_department = ?"
		args = append(args, department)
	}

	var total int
	db.DB.QueryRow(countQuery, args...).Scan(&total)

	query += " ORDER BY r.created_at DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "خطأ في جلب الطلبات",
		})
		return
	}
	defer rows.Close()

	var requests []models.Request
	for rows.Next() {
		var req models.Request
		err := rows.Scan(
			&req.ID, &req.Title, &req.Description, &req.DeputyID, &req.DeputyName,
			&req.Committee, &req.Purpose, &req.Phone, &req.Email, &req.Status,
			&req.AssignedDepartment, &req.DateReceived, &req.Deadline,
			&req.ReferralDate, &req.CompletedDate, &req.CreatedAt, &req.UpdatedAt,
		)
		if err != nil {
			continue
		}
		requests = append(requests, req)
	}

	writeJSON(w, http.StatusOK, models.PaginatedResponse{
		Success: true, Data: requests, Total: total, Page: page, Limit: limit,
	})
}

// GET /api/requests/{id}
func GetRequest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)
	role := getUserRole(r)

	var req models.Request
	err := db.DB.QueryRow(`
		SELECT id, title, description, deputy_id, deputy_name, committee, purpose,
		       phone, email, status, assigned_department, date_received, deadline,
		       referral_date, completed_date, created_at, updated_at
		FROM requests WHERE id = ?
	`, id).Scan(
		&req.ID, &req.Title, &req.Description, &req.DeputyID, &req.DeputyName,
		&req.Committee, &req.Purpose, &req.Phone, &req.Email, &req.Status,
		&req.AssignedDepartment, &req.DateReceived, &req.Deadline,
		&req.ReferralDate, &req.CompletedDate, &req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Message: "الطلب غير موجود",
		})
		return
	}

	// التحقق من صلاحية الوصول
	if role == "deputy" && (req.DeputyID == nil || *req.DeputyID != userID) {
		writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح بعرض هذا الطلب"})
		return
	}
	if role == "department_head" {
		var deptID string
		db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", userID).Scan(&deptID)
		if req.AssignedDepartment == nil || *req.AssignedDepartment != deptID {
			writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح بعرض هذا الطلب"})
			return
		}
	}

	// جلب التأكيد
	var conf models.RequestConfirmation
	err = db.DB.QueryRow(`
		SELECT id, request_id, service_type, classification, completion_days, confirmed_by, confirmed_at
		FROM request_confirmations WHERE request_id = ?
	`, id).Scan(&conf.ID, &conf.RequestID, &conf.ServiceType, &conf.Classification,
		&conf.CompletionDays, &conf.ConfirmedBy, &conf.ConfirmedAt)
	if err == nil {
		req.Confirmation = &conf
	}

	// جلب الملاحظات
	noteRows, _ := db.DB.Query(`
		SELECT id, entity_type, entity_id, user_id, user_name, content, created_at
		FROM notes WHERE entity_type = 'request' AND entity_id = ? ORDER BY created_at DESC
	`, id)
	if noteRows != nil {
		defer noteRows.Close()
		for noteRows.Next() {
			var n models.Note
			if noteRows.Scan(&n.ID, &n.EntityType, &n.EntityID, &n.UserID, &n.UserName, &n.Content, &n.CreatedAt) == nil {
				req.Notes = append(req.Notes, n)
			}
		}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Data: req})
}

// POST /api/requests
func CreateRequest(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)

	var input models.CreateRequestInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}

	// جلب بيانات النائب
	var user models.User
	db.DB.QueryRow("SELECT name, committee, phone, email FROM users WHERE id = ?", userID).Scan(
		&user.Name, &user.Committee, &user.Phone, &user.Email,
	)

	// إنشاء معرف الطلب
	reqID := generateID("REQ")

	_, err := db.DB.Exec(`
		INSERT INTO requests (id, title, description, deputy_id, deputy_name, committee, purpose, phone, email, status, date_received)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
	`, reqID, sanitize(input.Title), sanitize(input.Description), userID, user.Name, user.Committee, sanitize(input.Purpose), user.Phone, user.Email, time.Now())

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل إنشاء الطلب",
		})
		return
	}

	logActivity(userID, user.Name, "create_request", strPtr("request"), &reqID, "تقديم طلب بحثي جديد")

	writeJSON(w, http.StatusCreated, models.APIResponse{
		Success: true, Message: "تم تقديم الطلب بنجاح", Data: map[string]string{"id": reqID},
	})
}

// PUT /api/requests/{id}/return - إرجاع الطلب (بحث موجود مسبقاً)
func ReturnRequest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	var input struct {
		Reason             string `json:"reason"`
		ExistingResearchID string `json:"existing_research_id"`
		Notes              string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}

	result, err := db.DB.Exec(`
		UPDATE requests SET status = 'returned_exists', updated_at = ?
		WHERE id = ? AND status = 'pending'
	`, time.Now(), id)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل إرجاع الطلب",
		})
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "الطلب غير متاح للإرجاع",
		})
		return
	}

	// إضافة ملاحظة
	var userName string
	db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName)

	note := input.Notes
	if note == "" {
		note = "تم إرجاع الطلب - البحث موجود مسبقاً"
	}

	db.DB.Exec(`
		INSERT INTO notes (entity_type, entity_id, user_id, user_name, content)
		VALUES ('request', ?, ?, ?, ?)
	`, id, userID, userName, note)

	logActivity(userID, userName, "return_request", strPtr("request"), &id, "إرجاع الطلب - بحث موجود مسبقاً")

	// إشعار النائب
	var deputyID int
	db.DB.QueryRow("SELECT deputy_id FROM requests WHERE id = ?", id).Scan(&deputyID)
	if deputyID > 0 {
		createNotification(deputyID, "تم إرجاع طلبك",
			fmt.Sprintf("تم إرجاع الطلب %s - %s", id, note),
			"info", strPtr("request"), &id)
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Message: "تم إرجاع الطلب بنجاح",
	})
}

// PUT /api/requests/{id}/assign
func AssignRequest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	var input models.AssignRequestInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}

	result, err := db.DB.Exec(`
		UPDATE requests SET assigned_department = ?, status = 'assigned',
		       referral_date = ?, updated_at = ?
		WHERE id = ? AND status = 'pending'
	`, input.DepartmentID, time.Now(), time.Now(), id)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل إحالة الطلب",
		})
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "الطلب غير متاح للإحالة",
		})
		return
	}

	var userName string
	db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName)
	logActivity(userID, userName, "assign_request", strPtr("request"), &id,
		fmt.Sprintf("إحالة الطلب إلى قسم %s", input.DepartmentID))

	// إشعار رئيس القسم
	var headID int
	db.DB.QueryRow("SELECT id FROM users WHERE department_id = ? AND role = 'department_head'", input.DepartmentID).Scan(&headID)
	if headID > 0 {
		createNotification(headID, "طلب بحثي جديد",
			fmt.Sprintf("تمت إحالة الطلب %s إلى قسمكم", id),
			"info", strPtr("request"), &id)
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Message: "تمت إحالة الطلب بنجاح",
	})
}

// PUT /api/requests/{id}/confirm
func ConfirmRequest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	// التحقق أن الطلب محال لقسم رئيس القسم
	var reqDept, userDept string
	db.DB.QueryRow("SELECT assigned_department FROM requests WHERE id = ?", id).Scan(&reqDept)
	db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", userID).Scan(&userDept)
	if reqDept != userDept {
		writeJSON(w, http.StatusForbidden, models.APIResponse{
			Success: false, Message: "هذا الطلب غير محال لقسمك",
		})
		return
	}

	var input models.ConfirmRequestInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}

	// إنشاء التأكيد
	_, err := db.DB.Exec(`
		INSERT INTO request_confirmations (request_id, service_type, classification, completion_days, confirmed_by)
		VALUES (?, ?, ?, ?, ?)
	`, id, input.ServiceType, input.Classification, input.CompletionDays, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل تأكيد الطلب",
		})
		return
	}

	// تحديث حالة الطلب
	db.DB.Exec("UPDATE requests SET status = 'confirmed', updated_at = ? WHERE id = ?", time.Now(), id)

	// إنشاء مهمة بحثية
	taskID := generateID("RT")

	var deadline *time.Time
	if input.CompletionDays > 0 {
		d := time.Now().AddDate(0, 0, input.CompletionDays)
		deadline = &d
	}

	db.DB.Exec(`
		INSERT INTO research_tasks (id, request_id, researcher_id, status, deadline, completion_days)
		VALUES (?, ?, ?, 'assigned', ?, ?)
	`, taskID, id, input.ResearcherID, deadline, input.CompletionDays)

	// تحديث حالة الطلب
	db.DB.Exec("UPDATE requests SET status = 'in_progress', updated_at = ? WHERE id = ?", time.Now(), id)

	var userName string
	db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName)
	logActivity(userID, userName, "confirm_request", strPtr("request"), &id, "تأكيد الطلب وتعيين باحث")

	// إشعار الباحث
	createNotification(input.ResearcherID, "مهمة بحثية جديدة",
		fmt.Sprintf("تم تعيينك للعمل على الطلب %s", id),
		"info", strPtr("research_task"), &taskID)

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Message: "تم تأكيد الطلب وتعيين الباحث بنجاح",
	})
}
