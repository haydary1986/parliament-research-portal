package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
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
		r.assigned_department, r.can_share,
		COALESCE(r.confidentiality, 'public'), r.requester_type,
		r.date_received, r.deadline,
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
		// رئيس القسم يرى أي طلب محال إليه عبر r.assigned_department أو request_departments
		query += " AND (r.assigned_department = ? OR r.id IN (SELECT request_id FROM request_departments WHERE department_id = ?))"
		countQuery += " AND (r.assigned_department = ? OR r.id IN (SELECT request_id FROM request_departments WHERE department_id = ?))"
		args = append(args, deptID, deptID)
	}

	if status != "" {
		query += " AND r.status = ?"
		countQuery += " AND r.status = ?"
		args = append(args, status)
	}
	if department != "" {
		// الفلترة الصريحة بقسم تطابق primary أو junction
		query += " AND (r.assigned_department = ? OR r.id IN (SELECT request_id FROM request_departments WHERE department_id = ?))"
		countQuery += " AND (r.assigned_department = ? OR r.id IN (SELECT request_id FROM request_departments WHERE department_id = ?))"
		args = append(args, department, department)
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

	requests := []models.Request{}
	idIndex := map[string]int{} // request_id → index in requests slice
	for rows.Next() {
		var req models.Request
		err := rows.Scan(
			&req.ID, &req.Title, &req.Description, &req.DeputyID, &req.DeputyName,
			&req.Committee, &req.Purpose, &req.Phone, &req.Email, &req.Status,
			&req.AssignedDepartment, &req.CanShare,
			&req.Confidentiality, &req.RequesterType,
			&req.DateReceived, &req.Deadline,
			&req.ReferralDate, &req.CompletedDate,
			&req.ExistingResearchID, &req.DeliveredToDeputyDate,
			&req.Archived, &req.ArchivedDate, &req.FinalReviewBy, &req.FinalReviewDate,
			&req.AssistantReviewBy, &req.AssistantReviewDate,
			&req.CreatedAt, &req.UpdatedAt,
		)
		if err != nil {
			log.Printf("GetRequests scan: %v", err)
			continue
		}
		idIndex[req.ID] = len(requests)
		requests = append(requests, req)
	}

	// إثراء كل request بقائمة الأقسام المُحالة - استعلام واحد للجميع
	if len(requests) > 0 {
		ids := make([]interface{}, len(requests))
		i := 0
		for id := range idIndex {
			ids[i] = id
			i++
		}
		deptRows, err := db.DB.Query(
			"SELECT request_id, department_id FROM request_departments WHERE request_id IN ("+placeholders(len(ids))+")",
			ids...,
		)
		if err == nil {
			defer deptRows.Close()
			for deptRows.Next() {
				var reqID, deptID string
				if deptRows.Scan(&reqID, &deptID) == nil {
					if idx, ok := idIndex[reqID]; ok {
						requests[idx].AssignedDepartments = append(requests[idx].AssignedDepartments, deptID)
					}
				}
			}
		}
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
		       phone, email, status, assigned_department, can_share,
		       COALESCE(confidentiality, 'public'), requester_type,
		       date_received, deadline,
		       referral_date, completed_date, existing_research_id, delivered_to_deputy_date,
		       archived, archived_date, final_review_by, final_review_date,
		       assistant_review_by, assistant_review_date,
		       created_at, updated_at
		FROM requests WHERE id = ?
	`, id).Scan(
		&req.ID, &req.Title, &req.Description, &req.DeputyID, &req.DeputyName,
		&req.Committee, &req.Purpose, &req.Phone, &req.Email, &req.Status,
		&req.AssignedDepartment, &req.CanShare,
		&req.Confidentiality, &req.RequesterType,
		&req.DateReceived, &req.Deadline,
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

	// التحقق من صلاحية الوصول — يشمل الآن الباحث والمدقق أيضاً،
	// إذ كان أي مستخدم مصادَق يقرأ أي طلب قبل إضافة المرفقات
	if !canAccessRequest(id, userID, role) {
		writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح بعرض هذا الطلب"})
		return
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

	// اقتراح مدير الدائرة للباحث (اختياري) — لتهيئة نموذج تأكيد رئيس القسم
	var suggested sql.NullString
	logErr("GetRequest suggested_researchers",
		db.DB.QueryRow("SELECT suggested_researchers FROM requests WHERE id = ?", id).Scan(&suggested))
	if suggested.Valid && suggested.String != "" {
		for _, part := range strings.Split(suggested.String, ",") {
			if n, err := strconv.Atoi(strings.TrimSpace(part)); err == nil && n > 0 {
				req.SuggestedResearchers = append(req.SuggestedResearchers, n)
			}
		}
	}

	// عدد كتب المخاطبات الرسمية لكل مهام هذا الطلب
	logErr("GetRequest letters count", db.DB.QueryRow(`
		SELECT COUNT(*) FROM information_requests ir
		JOIN research_tasks rt ON rt.id = ir.research_task_id
		WHERE rt.request_id = ?
	`, id).Scan(&req.OfficialLettersCount))

	// ملفات البحث المرفوعة — بدونها كانت سلسلة المراجعة تعتمد بحوثاً لا تراها،
	// والجهة الطالبة لا تستلم مخرَج طلبها إطلاقاً
	fileRows, err := db.DB.Query(`
		SELECT rt.id, rt.researcher_id, COALESCE(u.name, ''), rt.file_path,
		       rt.status, rt.submitted_date, rt.updated_at
		FROM research_tasks rt
		LEFT JOIN users u ON u.id = rt.researcher_id
		WHERE rt.request_id = ? AND rt.file_path IS NOT NULL AND rt.file_path != ''
		ORDER BY rt.updated_at DESC
	`, id)
	if err == nil {
		defer fileRows.Close()
		for fileRows.Next() {
			var f models.RequestFile
			if fileRows.Scan(&f.TaskID, &f.ResearcherID, &f.ResearcherName,
				&f.FilePath, &f.TaskStatus, &f.SubmittedDate, &f.UpdatedAt) == nil {
				req.Files = append(req.Files, f)
			}
		}
	} else {
		logErr("GetRequest files", err)
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

	// جلب بيانات الجهة الطالبة
	var user models.User
	logErr("CreateRequest user lookup",
		db.DB.QueryRow("SELECT name, committee, phone, email, requester_type FROM users WHERE id = ?", userID).Scan(
			&user.Name, &user.Committee, &user.Phone, &user.Email, &user.RequesterType,
		))

	// الغرض مقيَّد بـ CHECK في المخطط — نتحقّق هنا لنعيد 400 مفهومة
	// بدل انفجار القيد داخل INSERT وعودة 500 غامضة
	purpose, okPurpose := normalizePurpose(input.Purpose)
	if !okPurpose {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "غرض الطلب غير صالح — يجب أن يكون رقابياً أو تشريعياً أو أخرى",
		})
		return
	}

	// اختيار اللجنة: من الإدخال إذا قدّمها الطالب، وإلا من سجل المستخدم
	committee := sanitize(input.Committee)
	if committee == "" && user.Committee != nil {
		committee = *user.Committee
	}
	if bad := validateCommittees(committee); bad != "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "لجنة غير معتمدة: " + bad,
		})
		return
	}

	canShare := 0
	if input.CanShare {
		canShare = 1
	}

	// تصنيف السرية يحدده الطالب — الافتراضي 'public'
	confidentiality := normalizeConfidentiality(input.Confidentiality)

	// نوع الجهة الطالبة يُنسخ من حساب المستخدم لحفظه تاريخياً على الطلب
	requesterType := "deputy"
	if user.RequesterType != nil && *user.RequesterType != "" {
		requesterType = *user.RequesterType
	}

	reqID := generateID("REQ")

	_, err := db.DB.Exec(`
		INSERT INTO requests (id, title, description, deputy_id, deputy_name, committee, purpose, phone, email, status, can_share, confidentiality, requester_type, date_received)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
	`, reqID, sanitize(input.Title), sanitize(input.Description), userID, user.Name, committee, purpose,
		user.Phone, user.Email, canShare, confidentiality, requesterType, time.Now())

	if err != nil {
		log.Printf("CreateRequest INSERT failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل إنشاء الطلب",
		})
		return
	}

	logActivityIP(r, userID, user.Name, "create_request", strPtr("request"), &reqID, "تقديم طلب بحثي جديد")

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

		if err := logActivityTx(tx, r, userID, userName, "return_request", strPtr("request"), &id, "إرجاع الطلب - بحث موجود مسبقاً"); err != nil {
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

// PUT /api/requests/{id} - تعديل بيانات الطلب (مدير الدائرة)
// يسمح بتصحيح العنوان والوصف والغرض واللجنة والموعد والسرية بعد التقديم.
// لا يُسمح بالتعديل بعد تسليم البحث للنائب.
func UpdateRequest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	var input models.UpdateRequestInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "بيانات غير صالحة"})
		return
	}

	// الحالة الحالية + القيم الحالية (لملء ما لم يُرسَل)
	var current models.Request
	var currentConf string
	err := db.DB.QueryRow(`
		SELECT status, title, description, purpose, committee, can_share,
		       COALESCE(confidentiality, 'public')
		FROM requests WHERE id = ?
	`, id).Scan(&current.Status, &current.Title, &current.Description,
		&current.Purpose, &current.Committee, &current.CanShare, &currentConf)
	if err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "الطلب غير موجود"})
		return
	}

	locked := map[string]bool{"delivered": true, "completed": true, "returned_exists": true, "rejected": true}
	if locked[current.Status] {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "لا يمكن تعديل طلب مُسلَّم أو منتهٍ",
		})
		return
	}

	// دمج المدخلات مع القيم الحالية
	title := sanitize(input.Title)
	if title == "" {
		title = current.Title
	}
	if len(title) < 5 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "عنوان الطلب قصير جداً"})
		return
	}

	description := sanitize(input.Description)
	if description == "" && current.Description != nil {
		description = *current.Description
	}

	purpose := sanitize(input.Purpose)
	if purpose == "" && current.Purpose != nil {
		purpose = *current.Purpose
	}
	if purpose != "" && !RequestPurposes[purpose] {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "الغرض غير صالح"})
		return
	}

	committee := sanitize(input.Committee)
	if committee == "" && current.Committee != nil {
		committee = *current.Committee
	}
	if bad := validateCommittees(committee); bad != "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "لجنة غير معتمدة: " + bad,
		})
		return
	}

	canShare := current.CanShare
	if input.CanShare != nil {
		canShare = 0
		if *input.CanShare {
			canShare = 1
		}
	}

	confidentiality := currentConf
	if input.Confidentiality != "" {
		confidentiality = normalizeConfidentiality(input.Confidentiality)
	}

	// الموعد النهائي: نص فارغ يمسحه، والقيمة الصالحة تحدّثه
	var deadline *time.Time
	clearDeadline := false
	if input.Deadline != nil {
		if *input.Deadline == "" {
			clearDeadline = true
		} else {
			parsed, perr := parseFlexibleDate(*input.Deadline)
			if perr != nil {
				writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "صيغة الموعد النهائي غير صالحة"})
				return
			}
			deadline = &parsed
		}
	}

	var userName string
	logErr("UpdateRequest userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()
		if _, err := tx.Exec(`
			UPDATE requests SET title = ?, description = ?, purpose = ?, committee = ?,
			       can_share = ?, confidentiality = ?, updated_at = ?
			WHERE id = ?
		`, title, description, purpose, committee, canShare, confidentiality, now, id); err != nil {
			return fmt.Errorf("UPDATE requests: %w", err)
		}

		if clearDeadline {
			if _, err := tx.Exec("UPDATE requests SET deadline = NULL WHERE id = ?", id); err != nil {
				return fmt.Errorf("clear deadline: %w", err)
			}
		} else if deadline != nil {
			if _, err := tx.Exec("UPDATE requests SET deadline = ? WHERE id = ?", *deadline, id); err != nil {
				return fmt.Errorf("UPDATE deadline: %w", err)
			}
		}

		if _, err := tx.Exec(
			`INSERT INTO notes (entity_type, entity_id, user_id, user_name, content) VALUES ('request', ?, ?, ?, ?)`,
			id, userID, userName, "عدّل مدير الدائرة بيانات الطلب",
		); err != nil {
			return fmt.Errorf("INSERT note: %w", err)
		}

		return logActivityTx(tx, r, userID, userName, "update_request", strPtr("request"), &id, "تعديل بيانات الطلب")
	})

	if txErr != nil {
		log.Printf("UpdateRequest tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل تعديل الطلب"})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم تعديل الطلب بنجاح"})
}

// PUT /api/requests/{id}/withdraw - الجهة الطالبة تسحب طلبها
// متاح ما دام الطلب لم يُحَل بعد (pending فقط)
func WithdrawRequest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	var input struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&input)

	var owner sql.NullInt64
	var status string
	if err := db.DB.QueryRow("SELECT deputy_id, status FROM requests WHERE id = ?", id).Scan(&owner, &status); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "الطلب غير موجود"})
		return
	}
	if !owner.Valid || int(owner.Int64) != userID {
		writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "لا يمكنك سحب طلب لا يخصك"})
		return
	}
	if status != "pending" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "لا يمكن السحب بعد إحالة الطلب — راجع مدير الدائرة",
		})
		return
	}

	var userName string
	logErr("WithdrawRequest userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	note := sanitize(input.Reason)
	if note == "" {
		note = "سحبت الجهة الطالبة الطلب"
	} else {
		note = "سحبت الجهة الطالبة الطلب — " + note
	}

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()
		// «مسحوب» لا «مرفوض»: سحب الجهة الطالبة لطلبها ليس رفضاً من الدائرة،
		// وخلطهما يضخّم إحصاءات الرفض ويُظهر للنائب أن طلبه رُفض.
		res, err := tx.Exec(
			"UPDATE requests SET status = 'withdrawn', updated_at = ? WHERE id = ? AND status = 'pending'", now, id)
		if err != nil {
			return fmt.Errorf("UPDATE requests: %w", err)
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return fmt.Errorf("الطلب لم يعد متاحاً للسحب")
		}
		if _, err := tx.Exec(
			`INSERT INTO notes (entity_type, entity_id, user_id, user_name, content) VALUES ('request', ?, ?, ?, ?)`,
			id, userID, userName, note,
		); err != nil {
			return fmt.Errorf("INSERT note: %w", err)
		}
		return logActivityTx(tx, r, userID, userName, "withdraw_request", strPtr("request"), &id, note)
	})

	if txErr != nil {
		log.Printf("WithdrawRequest tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل سحب الطلب"})
		return
	}
	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم سحب الطلب"})
}

// PUT /api/requests/{id}/reject - مدير الدائرة يرفض طلباً قبل إحالته
//
// كانت واجهة المدير تعرض خيار «رفض وإرجاع» مشروطاً بحالة
// under_manager_review المحذوفة من المخطط، فلم يكن أي دور يستطيع رفض طلب
// غير مختص؛ الحالة 'rejected' لم تكن تُكتب إلا من سحب النائب لطلبه.
// الرفض متاح قبل الإحالة فقط (pending)، ويشترط سبباً مسجَّلاً.
// PUT /api/requests/{id}/cancel-referral - مدير الدائرة يلغي الإحالة ويعيد
// الطلب إلى «انتظار التوجيه» ليعيد توجيهه. تراجُع آمن: يُسمح به فقط قبل أن
// يؤكّد رئيس القسم (لا مهام بحث قائمة)، فلا يُفسد عملاً بدأ.
func CancelReferral(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	var status string
	if err := db.DB.QueryRow("SELECT status FROM requests WHERE id = ?", id).Scan(&status); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "الطلب غير موجود"})
		return
	}
	if status != "assigned" {
		writeJSON(w, http.StatusConflict, models.APIResponse{
			Success: false, Message: "لا يمكن إلغاء الإحالة إلا قبل أن يؤكّد رئيس القسم",
		})
		return
	}
	var tasks int
	logErr("CancelReferral task count",
		db.DB.QueryRow("SELECT COUNT(*) FROM research_tasks WHERE request_id = ?", id).Scan(&tasks))
	if tasks > 0 {
		writeJSON(w, http.StatusConflict, models.APIResponse{
			Success: false, Message: "بدأ العمل على الطلب — لا يمكن إلغاء الإحالة",
		})
		return
	}

	var userName string
	logErr("CancelReferral userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()
		res, err := tx.Exec(`
			UPDATE requests SET status = 'pending', assigned_department = NULL,
			       suggested_researchers = NULL, referral_date = NULL, updated_at = ?
			WHERE id = ? AND status = 'assigned'
		`, now, id)
		if err != nil {
			return fmt.Errorf("UPDATE requests: %w", err)
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return errStateConflict
		}
		if _, err := tx.Exec("DELETE FROM request_departments WHERE request_id = ?", id); err != nil {
			return fmt.Errorf("clear request_departments: %w", err)
		}
		return logActivityTx(tx, r, userID, userName, "cancel_referral", strPtr("request"), &id, "إلغاء الإحالة وإعادة الطلب لانتظار التوجيه")
	})

	if errors.Is(txErr, errStateConflict) {
		writeJSON(w, http.StatusConflict, models.APIResponse{Success: false, Message: "تغيّرت حالة الطلب، يرجى تحديث الصفحة"})
		return
	}
	if txErr != nil {
		log.Printf("CancelReferral tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل إلغاء الإحالة"})
		return
	}
	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "أُلغيت الإحالة — الطلب في انتظار التوجيه"})
}

func RejectRequest(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	var input struct {
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}

	reason := sanitize(input.Reason)
	if reason == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "سبب الرفض مطلوب",
		})
		return
	}

	var deputyID sql.NullInt64
	var status string
	if err := db.DB.QueryRow(
		"SELECT deputy_id, status FROM requests WHERE id = ?", id,
	).Scan(&deputyID, &status); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "الطلب غير موجود"})
		return
	}
	if status != "pending" {
		writeJSON(w, http.StatusConflict, models.APIResponse{
			Success: false, Message: "لا يمكن الرفض بعد إحالة الطلب — استخدم الإرجاع",
		})
		return
	}

	var userName string
	logErr("RejectRequest userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	note := "رُفض الطلب من مدير الدائرة — " + reason

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()
		res, err := tx.Exec(
			"UPDATE requests SET status = 'rejected', updated_at = ? WHERE id = ? AND status = 'pending'", now, id)
		if err != nil {
			return fmt.Errorf("UPDATE requests: %w", err)
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return fmt.Errorf("الطلب لم يعد متاحاً للرفض")
		}
		if _, err := tx.Exec(
			`INSERT INTO notes (entity_type, entity_id, user_id, user_name, content) VALUES ('request', ?, ?, ?, ?)`,
			id, userID, userName, note,
		); err != nil {
			return fmt.Errorf("INSERT note: %w", err)
		}
		if deputyID.Valid {
			if err := createNotificationTx(tx, int(deputyID.Int64), "رُفض طلبكم",
				fmt.Sprintf("رُفض الطلب %s: %s", id, reason),
				"warning", strPtr("request"), &id); err != nil {
				return err
			}
		}
		return logActivityTx(tx, r, userID, userName, "reject_request", strPtr("request"), &id, note)
	})

	if txErr != nil {
		log.Printf("RejectRequest tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل رفض الطلب"})
		return
	}
	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم رفض الطلب"})
}

// parseFlexibleDate يقبل YYYY-MM-DD أو RFC3339 الكامل
func parseFlexibleDate(v string) (time.Time, error) {
	if t, err := time.Parse("2006-01-02", v); err == nil {
		return t, nil
	}
	return time.Parse(time.RFC3339, v)
}

// PUT /api/requests/{id}/assign
// يدعم الإحالة لقسم واحد (legacy) أو قائمة أقسام (نقطة 1 من بوابة المدير)
// ويسمح لمدير الدائرة بتعيين الباحث/الباحثين مباشرة مع تفاصيل الإعداد.
// إن تُركت قائمة الباحثين فارغة، يبقى الطلب 'assigned' ويتولى رئيس القسم التعيين.
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

	// قائمة الباحثين المقترَحين من مدير الدائرة (اختيارية وغير مُلزِمة).
	// لا تُنشئ مهمة بحث ولا تُرسل الطلب للباحث — رئيس القسم يوافق ويعيّن
	// مستعيناً بها. إن قُدِّمت، نتحقّق أن الباحثين ضمن الأقسام المُحالة فقط.
	researchers := dedupeInts(input.ResearcherIDs)
	if len(researchers) > 0 {
		if msg := validateResearchersInDepartments(researchers, deptIDs); msg != "" {
			writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: msg})
			return
		}
	}

	var userName string
	logErr("AssignRequest user lookup", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	notFound := false
	notifyHeads := []int{} // الرؤساء الذين سيُخطرون

	primaryDept := deptIDs[0]

	// الطلب دائماً إلى «قيد الإحالة» بانتظار موافقة رئيس القسم — لا يذهب
	// للباحث مباشرةً حتى لو اقترح المدير باحثاً.
	newStatus := "assigned"

	// نص الاقتراح المخزَّن على الطلب (معرّفات مفصولة بفاصلة)
	suggested := ""
	for i, rid := range researchers {
		if i > 0 {
			suggested += ","
		}
		suggested += strconv.Itoa(rid)
	}

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()
		// التحديث الرئيسي للطلب: نخزن أول قسم كـ "primary" + الحالة
		result, err := tx.Exec(`
			UPDATE requests SET assigned_department = ?, status = ?,
			       suggested_researchers = ?, referral_date = ?, updated_at = ?
			WHERE id = ? AND status IN ('pending', 'assigned')
		`, primaryDept, newStatus, nullIfEmpty(suggested), now, now, id)
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
		if len(researchers) > 0 {
			details += fmt.Sprintf(" مع اقتراح %d باحث لرئيس القسم", len(researchers))
		}
		if err := logActivityTx(tx, r, userID, userName, "assign_request", strPtr("request"), &id, details); err != nil {
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

		headMsg := fmt.Sprintf("تمت إحالة الطلب %s إلى قسمكم — بانتظار تأكيدكم وتعيين الباحث", id)
		if len(researchers) > 0 {
			headMsg = fmt.Sprintf("تمت إحالة الطلب %s إلى قسمكم مع اقتراح باحث من مدير الدائرة — بانتظار تأكيدكم", id)
		}
		for _, h := range notifyHeads {
			if err := createNotificationTx(tx, h, "طلب بحثي جديد",
				headMsg, "info", strPtr("request"), &id); err != nil {
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

	msg := "تمت إحالة الطلب إلى القسم — بانتظار تأكيد رئيس القسم وتعيين الباحث"
	if len(researchers) > 0 {
		msg = fmt.Sprintf("تمت الإحالة مع اقتراح %d باحث — يعتمده رئيس القسم", len(researchers))
	}
	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: msg})
}

// dedupeInts يزيل التكرار والقيم غير الموجبة مع الحفاظ على الترتيب
func dedupeInts(in []int) []int {
	seen := map[int]bool{}
	out := []int{}
	for _, v := range in {
		if v > 0 && !seen[v] {
			seen[v] = true
			out = append(out, v)
		}
	}
	return out
}

// validateResearchersInDepartments يتحقق أن كل باحث نشط وينتمي لأحد الأقسام المُحالة.
// يرجع رسالة خطأ عربية عند الفشل، أو "" عند النجاح.
func validateResearchersInDepartments(researcherIDs []int, deptIDs []string) string {
	for _, rid := range researcherIDs {
		var role, status string
		var dept sql.NullString
		err := db.DB.QueryRow(
			"SELECT role, status, department_id FROM users WHERE id = ?", rid,
		).Scan(&role, &status, &dept)
		if err != nil {
			return fmt.Sprintf("الباحث رقم %d غير موجود", rid)
		}
		if role != "researcher" || status != "active" {
			return fmt.Sprintf("المستخدم رقم %d ليس باحثاً نشطاً", rid)
		}
		inDept := false
		for _, d := range deptIDs {
			if dept.Valid && dept.String == d {
				inDept = true
				break
			}
		}
		if !inDept {
			return fmt.Sprintf("الباحث رقم %d لا ينتمي إلى الأقسام المُحالة", rid)
		}
	}
	return ""
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

	// التحقق أن الطلب محال لقسم رئيس القسم (رئيسي أو ضمن الإحالة متعددة الأقسام)
	var exists int
	if err := db.DB.QueryRow("SELECT COUNT(*) FROM requests WHERE id = ?", id).Scan(&exists); err != nil || exists == 0 {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "الطلب غير موجود"})
		return
	}
	if allowed, _ := userDepartmentHandlesRequest(id, userID); !allowed {
		writeJSON(w, http.StatusForbidden, models.APIResponse{
			Success: false, Message: "هذا الطلب غير محال لقسمك",
		})
		return
	}

	// حارس الحالة: التأكيد يصحّ فقط على طلب في حالة الإحالة. بدونه كان
	// التأكيد الثاني (نقرة مزدوجة، أو رئيس قسم آخر في إحالة متعددة الأقسام)
	// يصطدم بقيد UNIQUE على request_confirmations فيعود 500 غامض.
	var confirmStatus string
	if err := db.DB.QueryRow("SELECT status FROM requests WHERE id = ?", id).Scan(&confirmStatus); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "الطلب غير موجود"})
		return
	}
	if confirmStatus != "assigned" {
		writeJSON(w, http.StatusConflict, models.APIResponse{
			Success: false, Message: "لا يمكن تأكيد الطلب — قد يكون أُكِّد مسبقاً أو تجاوز مرحلة الإحالة",
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
	researchers = dedupeInts(researchers)

	if input.ServiceType == "" || input.Classification == "" || len(researchers) == 0 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "يرجى تعبئة نوع الخدمة والتصنيف وباحث واحد على الأقل"})
		return
	}
	// القيمتان مقيَّدتان بـ CHECK في المخطط — نتحقّق هنا لنعيد 400 مفهومة
	if msg := validateConfirmation(input.ServiceType, input.Classification, input.CompletionDays); msg != "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: msg})
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
			// تأكيد متزامن سبق: قيد UNIQUE — نعيده 409 لا 500
			if isUniqueViolation(err) {
				return errStateConflict
			}
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

		res, err := tx.Exec(
			"UPDATE requests SET status = 'in_progress', updated_at = ? WHERE id = ? AND status = 'assigned'",
			now, id,
		)
		if err != nil {
			return fmt.Errorf("UPDATE requests: %w", err)
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return errStateConflict
		}

		details := "تأكيد الطلب وتعيين باحث"
		if len(researchers) > 1 {
			details = fmt.Sprintf("تأكيد الطلب وتعيين %d باحثين", len(researchers))
		}
		if err := logActivityTx(tx, r, userID, userName, "confirm_request", strPtr("request"), &id, details); err != nil {
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

	if errors.Is(txErr, errStateConflict) {
		writeJSON(w, http.StatusConflict, models.APIResponse{
			Success: false, Message: "تم تأكيد هذا الطلب مسبقاً",
		})
		return
	}
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

// GET /api/requests/{id}/timeline - سجل قرارات الطلب (من سجل النشاط).
// يعرض «من فعل ماذا ومتى» عبر مراحل الطلب. متاح لكل من يملك الوصول للطلب.
func GetRequestTimeline(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)
	role := getUserRole(r)

	// الطلب موجود؟
	var exists int
	if err := db.DB.QueryRow("SELECT COUNT(*) FROM requests WHERE id = ?", id).Scan(&exists); err != nil || exists == 0 {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "الطلب غير موجود"})
		return
	}
	if !canAccessRequest(id, userID, role) {
		writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح بعرض سجل هذا الطلب"})
		return
	}

	rows, err := db.DB.Query(`
		SELECT action, COALESCE(user_name, ''), COALESCE(details, ''), created_at
		FROM activity_logs
		WHERE entity_type = 'request' AND entity_id = ?
		ORDER BY created_at ASC, id ASC
	`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "خطأ في جلب السجل"})
		return
	}
	defer rows.Close()

	type entry struct {
		Action    string `json:"action"`
		UserName  string `json:"user_name"`
		Details   string `json:"details"`
		CreatedAt string `json:"created_at"`
	}
	timeline := []entry{}
	for rows.Next() {
		var e entry
		if rows.Scan(&e.Action, &e.UserName, &e.Details, &e.CreatedAt) == nil {
			timeline = append(timeline, e)
		}
	}
	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Data: timeline})
}
