package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
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
		r.assigned_department, r.can_share, r.date_received, r.deadline,
		r.referral_date, r.completed_date, r.existing_research_id,
		r.delivered_to_deputy_date, r.archived, r.archived_date,
		r.final_review_by, r.final_review_date,
		r.assistant_review_by, r.assistant_review_date,
		r.created_at, r.updated_at
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
			&req.AssignedDepartment, &req.CanShare, &req.DateReceived, &req.Deadline,
			&req.ReferralDate, &req.CompletedDate,
			&req.ExistingResearchID, &req.DeliveredToDeputyDate,
			&req.Archived, &req.ArchivedDate, &req.FinalReviewBy, &req.FinalReviewDate,
			&req.AssistantReviewBy, &req.AssistantReviewDate,
			&req.CreatedAt, &req.UpdatedAt,
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
		       phone, email, status, assigned_department, can_share, date_received, deadline,
		       referral_date, completed_date, existing_research_id, delivered_to_deputy_date,
		       archived, archived_date, final_review_by, final_review_date,
		       assistant_review_by, assistant_review_date,
		       created_at, updated_at
		FROM requests WHERE id = ?
	`, id).Scan(
		&req.ID, &req.Title, &req.Description, &req.DeputyID, &req.DeputyName,
		&req.Committee, &req.Purpose, &req.Phone, &req.Email, &req.Status,
		&req.AssignedDepartment, &req.CanShare, &req.DateReceived, &req.Deadline,
		&req.ReferralDate, &req.CompletedDate,
		&req.ExistingResearchID, &req.DeliveredToDeputyDate,
		&req.Archived, &req.ArchivedDate, &req.FinalReviewBy, &req.FinalReviewDate,
		&req.AssistantReviewBy, &req.AssistantReviewDate,
		&req.CreatedAt, &req.UpdatedAt,
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

	// جلب الأقسام المُحالة (multi-department)
	deptRows, _ := db.DB.Query("SELECT department_id FROM request_departments WHERE request_id = ?", id)
	if deptRows != nil {
		defer deptRows.Close()
		for deptRows.Next() {
			var d string
			if deptRows.Scan(&d) == nil {
				req.AssignedDepartments = append(req.AssignedDepartments, d)
			}
		}
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
	if len(input.Title) < 5 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "عنوان الطلب قصير جداً"})
		return
	}

	// جلب بيانات النائب
	var user models.User
	logErr("CreateRequest user lookup",
		db.DB.QueryRow("SELECT name, committee, phone, email FROM users WHERE id = ?", userID).Scan(
			&user.Name, &user.Committee, &user.Phone, &user.Email,
		))

	// اختيار اللجنة: من الإدخال إذا قدّمها النائب، وإلا من سجل المستخدم
	committee := sanitize(input.Committee)
	if committee == "" && user.Committee != nil {
		committee = *user.Committee
	}

	canShare := 0
	if input.CanShare {
		canShare = 1
	}

	reqID := generateID("REQ")

	_, err := db.DB.Exec(`
		INSERT INTO requests (id, title, description, deputy_id, deputy_name, committee, purpose, phone, email, status, can_share, date_received)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
	`, reqID, sanitize(input.Title), sanitize(input.Description), userID, user.Name, committee, sanitize(input.Purpose),
		user.Phone, user.Email, canShare, time.Now())

	if err != nil {
		log.Printf("CreateRequest INSERT failed: %v", err)
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

	var userName string
	logErr("ReturnRequest userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	note := input.Notes
	if note == "" {
		note = "تم إرجاع الطلب - البحث موجود مسبقاً"
	}
	note = sanitize(note)

	var deputyID int
	notAvailable := false

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()
		result, err := tx.Exec(`
			UPDATE requests SET status = 'returned_exists', updated_at = ?
			WHERE id = ? AND status = 'pending'
		`, now, id)
		if err != nil {
			return fmt.Errorf("UPDATE requests: %w", err)
		}
		affected, _ := result.RowsAffected()
		if affected == 0 {
			notAvailable = true
			return fmt.Errorf("الطلب غير متاح للإرجاع")
		}

		if _, err := tx.Exec(`
			INSERT INTO notes (entity_type, entity_id, user_id, user_name, content)
			VALUES ('request', ?, ?, ?, ?)
		`, id, userID, userName, note); err != nil {
			return fmt.Errorf("INSERT note: %w", err)
		}

		if err := logActivityTx(tx, userID, userName, "return_request", strPtr("request"), &id, "إرجاع الطلب - بحث موجود مسبقاً"); err != nil {
			return err
		}

		if err := tx.QueryRow("SELECT deputy_id FROM requests WHERE id = ?", id).Scan(&deputyID); err != nil && err != sql.ErrNoRows {
			return fmt.Errorf("lookup deputy: %w", err)
		}
		if deputyID > 0 {
			if err := createNotificationTx(tx, deputyID, "تم إرجاع طلبك",
				fmt.Sprintf("تم إرجاع الطلب %s - %s", id, note),
				"info", strPtr("request"), &id); err != nil {
				return err
			}
		}
		return nil
	})

	if notAvailable {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "الطلب غير متاح للإرجاع"})
		return
	}
	if txErr != nil {
		log.Printf("ReturnRequest tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل إرجاع الطلب"})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Message: "تم إرجاع الطلب بنجاح",
	})
}

// PUT /api/requests/{id}/assign
// يدعم الإحالة لقسم واحد (legacy) أو قائمة أقسام (نقطة 1 من بوابة المدير)
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

	// توحيد المدخلات: department_ids أو department_id واحد
	deptIDs := input.DepartmentIDs
	if len(deptIDs) == 0 && input.DepartmentID != "" {
		deptIDs = []string{input.DepartmentID}
	}
	// إزالة المكرر والفراغات
	seen := map[string]bool{}
	clean := deptIDs[:0]
	for _, d := range deptIDs {
		if d != "" && !seen[d] {
			seen[d] = true
			clean = append(clean, d)
		}
	}
	deptIDs = clean
	if len(deptIDs) == 0 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "يرجى تحديد قسم واحد على الأقل"})
		return
	}

	var userName string
	logErr("AssignRequest user lookup", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	notFound := false
	notifyHeads := []int{} // الرؤساء الذين سيُخطرون

	primaryDept := deptIDs[0]

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()
		// التحديث الرئيسي للطلب: نخزن أول قسم كـ "primary" + الحالة
		result, err := tx.Exec(`
			UPDATE requests SET assigned_department = ?, status = 'assigned',
			       referral_date = ?, updated_at = ?
			WHERE id = ? AND status IN ('pending', 'assigned')
		`, primaryDept, now, now, id)
		if err != nil {
			return fmt.Errorf("UPDATE requests: %w", err)
		}
		affected, _ := result.RowsAffected()
		if affected == 0 {
			notFound = true
			return fmt.Errorf("الطلب غير متاح للإحالة")
		}

		// تنظيف الإحالات السابقة ثم إعادة الإدراج (idempotent)
		if _, err := tx.Exec(`DELETE FROM request_departments WHERE request_id = ?`, id); err != nil {
			return fmt.Errorf("clear request_departments: %w", err)
		}
		for _, d := range deptIDs {
			if _, err := tx.Exec(
				`INSERT INTO request_departments (request_id, department_id) VALUES (?, ?)`,
				id, d,
			); err != nil {
				return fmt.Errorf("INSERT request_department: %w", err)
			}
		}

		details := fmt.Sprintf("إحالة الطلب إلى قسم %s", primaryDept)
		if len(deptIDs) > 1 {
			details = fmt.Sprintf("إحالة الطلب إلى %d أقسام", len(deptIDs))
		}
		if err := logActivityTx(tx, userID, userName, "assign_request", strPtr("request"), &id, details); err != nil {
			return err
		}

		// جمع رؤساء كل الأقسام للإشعار
		rows, err := tx.Query(`
			SELECT id FROM users
			WHERE department_id IN (`+placeholders(len(deptIDs))+`)
			  AND role = 'department_head'
			  AND status = 'active'
		`, toAny(deptIDs)...)
		if err != nil {
			return fmt.Errorf("lookup department heads: %w", err)
		}
		for rows.Next() {
			var h int
			if rows.Scan(&h) == nil {
				notifyHeads = append(notifyHeads, h)
			}
		}
		rows.Close()

		for _, h := range notifyHeads {
			if err := createNotificationTx(tx, h, "طلب بحثي جديد",
				fmt.Sprintf("تمت إحالة الطلب %s إلى قسمكم", id),
				"info", strPtr("request"), &id); err != nil {
				return err
			}
		}
		return nil
	})

	if notFound {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "الطلب غير متاح للإحالة",
		})
		return
	}
	if txErr != nil {
		log.Printf("AssignRequest tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل إحالة الطلب",
		})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Message: "تمت إحالة الطلب بنجاح",
	})
}

// مساعد: ينشئ "?,?,?" للـ IN clause
func placeholders(n int) string {
	if n == 0 {
		return ""
	}
	s := "?"
	for i := 1; i < n; i++ {
		s += ",?"
	}
	return s
}

// مساعد: يحول []string إلى []any للـ db.Query
func toAny(s []string) []interface{} {
	out := make([]interface{}, len(s))
	for i, v := range s {
		out[i] = v
	}
	return out
}

// PUT /api/requests/{id}/confirm
func ConfirmRequest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	// التحقق أن الطلب محال لقسم رئيس القسم
	var reqDept, userDept sql.NullString
	if err := db.DB.QueryRow("SELECT assigned_department FROM requests WHERE id = ?", id).Scan(&reqDept); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "الطلب غير موجود"})
		return
	}
	logErr("ConfirmRequest user lookup", db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", userID).Scan(&userDept))
	if !reqDept.Valid || !userDept.Valid || reqDept.String != userDept.String {
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

	// توحيد الباحثين: قائمة researcher_ids أو researcher_id واحد
	researchers := input.ResearcherIDs
	if len(researchers) == 0 && input.ResearcherID != 0 {
		researchers = []int{input.ResearcherID}
	}
	// تنظيف التكرار
	seenR := map[int]bool{}
	cleanR := researchers[:0]
	for _, r := range researchers {
		if r > 0 && !seenR[r] {
			seenR[r] = true
			cleanR = append(cleanR, r)
		}
	}
	researchers = cleanR

	if input.ServiceType == "" || input.Classification == "" || len(researchers) == 0 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "يرجى تعبئة نوع الخدمة والتصنيف وباحث واحد على الأقل"})
		return
	}
	if input.CompletionDays < 1 || input.CompletionDays > 365 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "مدة الإنجاز يجب أن تكون بين 1 و 365 يوماً"})
		return
	}

	var userName string
	logErr("ConfirmRequest userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	var deadline *time.Time
	if input.CompletionDays > 0 {
		d := time.Now().AddDate(0, 0, input.CompletionDays)
		deadline = &d
	}

	type assignedTask struct {
		taskID       string
		researcherID int
	}
	var createdTasks []assignedTask

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()

		if _, err := tx.Exec(`
			INSERT INTO request_confirmations (request_id, service_type, classification, completion_days, confirmed_by)
			VALUES (?, ?, ?, ?, ?)
		`, id, input.ServiceType, input.Classification, input.CompletionDays, userID); err != nil {
			return fmt.Errorf("INSERT confirmation: %w", err)
		}

		// نقطة 1 من بوابة القسم: تعيين باحثين متعددين => مهمة لكل باحث
		for _, rid := range researchers {
			taskID := generateID("RT")
			if _, err := tx.Exec(`
				INSERT INTO research_tasks (id, request_id, researcher_id, status, deadline, completion_days)
				VALUES (?, ?, ?, 'assigned', ?, ?)
			`, taskID, id, rid, deadline, input.CompletionDays); err != nil {
				return fmt.Errorf("INSERT research_task: %w", err)
			}
			createdTasks = append(createdTasks, assignedTask{taskID, rid})
		}

		if _, err := tx.Exec(
			"UPDATE requests SET status = 'in_progress', updated_at = ? WHERE id = ?",
			now, id,
		); err != nil {
			return fmt.Errorf("UPDATE requests: %w", err)
		}

		details := "تأكيد الطلب وتعيين باحث"
		if len(researchers) > 1 {
			details = fmt.Sprintf("تأكيد الطلب وتعيين %d باحثين", len(researchers))
		}
		if err := logActivityTx(tx, userID, userName, "confirm_request", strPtr("request"), &id, details); err != nil {
			return err
		}

		// إشعار كل الباحثين المعينين
		for _, t := range createdTasks {
			tID := t.taskID
			if err := createNotificationTx(tx, t.researcherID, "مهمة بحثية جديدة",
				fmt.Sprintf("تم تعيينك للعمل على الطلب %s", id),
				"info", strPtr("research_task"), &tID); err != nil {
				return err
			}
		}
		return nil
	})

	if txErr != nil {
		log.Printf("ConfirmRequest tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل تأكيد الطلب",
		})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Message: "تم تأكيد الطلب وتعيين الباحثين بنجاح",
	})
}

// PUT /api/requests/{id}/final-review - مراجعة نهائية من مدير الدائرة بعد التدقيق
func FinalReviewRequest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	var input struct {
		Decision string `json:"decision"` // "approve" | "reject"
		Notes    string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "بيانات غير صالحة"})
		return
	}
	if input.Decision != "approve" && input.Decision != "reject" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "القرار يجب أن يكون approve أو reject"})
		return
	}

	var currentStatus string
	if err := db.DB.QueryRow("SELECT status FROM requests WHERE id = ?", id).Scan(&currentStatus); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "الطلب غير موجود"})
		return
	}
	if currentStatus != "under_manager_review" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "الطلب ليس في مرحلة المراجعة النهائية"})
		return
	}

	var userName string
	logErr("FinalReview userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	if input.Decision == "approve" {
		var deputyID int
		var rtID string
		var researcherID int

		txErr := withTx(func(tx *sql.Tx) error {
			now := time.Now()
			if _, err := tx.Exec(`
				UPDATE requests SET status = 'delivered', completed_date = ?,
				       delivered_to_deputy_date = ?, final_review_by = ?, final_review_date = ?, updated_at = ?
				WHERE id = ?
			`, now, now, userID, now, now, id); err != nil {
				return fmt.Errorf("UPDATE requests: %w", err)
			}

			if err := tx.QueryRow("SELECT deputy_id FROM requests WHERE id = ?", id).Scan(&deputyID); err != nil && err != sql.ErrNoRows {
				return fmt.Errorf("lookup deputy: %w", err)
			}
			if err := tx.QueryRow("SELECT id, researcher_id FROM research_tasks WHERE request_id = ?", id).Scan(&rtID, &researcherID); err != nil && err != sql.ErrNoRows {
				return fmt.Errorf("lookup research task: %w", err)
			}

			if deputyID > 0 {
				if err := createNotificationTx(tx, deputyID, "تم تسليم البحث",
					fmt.Sprintf("تم الانتهاء من بحث طلبك %s وتسليم نسخة إليك", id),
					"success", strPtr("request"), &id); err != nil {
					return err
				}
			}
			if researcherID > 0 {
				if err := createNotificationTx(tx, researcherID, "يرجى الموافقة على الأرشفة",
					fmt.Sprintf("تم اعتماد بحثك. يرجى تحديد موافقتك على إرسال نسخة للمستودع الرقمي (مهمة %s)", rtID),
					"info", strPtr("research_task"), &rtID); err != nil {
					return err
				}
			}
			return logActivityTx(tx, userID, userName, "final_approve", strPtr("request"), &id, "اعتماد نهائي وتسليم للنائب")
		})

		if txErr != nil {
			log.Printf("FinalReview approve tx failed: %v", txErr)
			writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل اعتماد المراجعة"})
			return
		}
		writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم الاعتماد النهائي وتسليم البحث للنائب"})
		return
	}

	// رفض
	note := input.Notes
	if note == "" {
		note = "رفض المراجعة النهائية - يرجى المراجعة والتعديل"
	}

	var rtID string
	var researcherID int

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()
		if _, err := tx.Exec("UPDATE requests SET status = 'in_progress', updated_at = ? WHERE id = ?", now, id); err != nil {
			return fmt.Errorf("UPDATE requests: %w", err)
		}
		if err := tx.QueryRow("SELECT id, researcher_id FROM research_tasks WHERE request_id = ?", id).Scan(&rtID, &researcherID); err != nil && err != sql.ErrNoRows {
			return fmt.Errorf("lookup research task: %w", err)
		}
		if rtID != "" {
			if _, err := tx.Exec("UPDATE research_tasks SET status = 'in_progress', updated_at = ? WHERE id = ?", now, rtID); err != nil {
				return fmt.Errorf("UPDATE research_task: %w", err)
			}
		}
		if _, err := tx.Exec(
			`INSERT INTO notes (entity_type, entity_id, user_id, user_name, content) VALUES ('request', ?, ?, ?, ?)`,
			id, userID, userName, sanitize(note),
		); err != nil {
			return fmt.Errorf("INSERT note: %w", err)
		}
		if researcherID > 0 {
			if err := createNotificationTx(tx, researcherID, "رجوع البحث للمراجعة",
				fmt.Sprintf("تم رفض المراجعة النهائية للطلب %s: %s", id, note),
				"warning", strPtr("research_task"), &rtID); err != nil {
				return err
			}
		}
		return logActivityTx(tx, userID, userName, "final_reject", strPtr("request"), &id, "رفض المراجعة النهائية - إرجاع للباحث")
	})

	if txErr != nil {
		log.Printf("FinalReview reject tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل رفض المراجعة"})
		return
	}
	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم إرجاع البحث للباحث"})
}
