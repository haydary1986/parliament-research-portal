package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"noab-backend/db"
	"noab-backend/models"
)

// GET /api/research-tasks
func GetResearchTasks(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	role := getUserRole(r)
	status := r.URL.Query().Get("status")

	query := `SELECT rt.id, rt.request_id, rt.researcher_id, rt.status,
		rt.file_path, rt.date_assigned, rt.deadline, rt.completion_days,
		rt.submitted_date, rt.archive_consent, rt.archive_consent_date,
		rt.archive_consent_notes, rt.created_at, rt.updated_at
		FROM research_tasks rt WHERE 1=1`
	var args []interface{}

	if role == "researcher" {
		query += " AND rt.researcher_id = ?"
		args = append(args, userID)
	} else if role == "department_head" {
		var deptID string
		db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", userID).Scan(&deptID)
		query += " AND rt.researcher_id IN (SELECT id FROM users WHERE department_id = ?)"
		args = append(args, deptID)
	}

	if status != "" {
		query += " AND rt.status = ?"
		args = append(args, status)
	}

	query += " ORDER BY rt.created_at DESC"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "خطأ في جلب المهام البحثية",
		})
		return
	}
	defer rows.Close()

	type ResearchTaskWithDetails struct {
		models.ResearchTask
		RequestTitle   string `json:"request_title"`
		ResearcherName string `json:"researcher_name"`
	}

	var tasks []ResearchTaskWithDetails
	for rows.Next() {
		var t ResearchTaskWithDetails
		err := rows.Scan(&t.ID, &t.RequestID, &t.ResearcherID, &t.Status,
			&t.FilePath, &t.DateAssigned, &t.Deadline, &t.CompletionDays,
			&t.SubmittedDate, &t.ArchiveConsent, &t.ArchiveConsentDate,
			&t.ArchiveConsentNotes, &t.CreatedAt, &t.UpdatedAt)
		if err != nil {
			continue
		}
		db.DB.QueryRow("SELECT title FROM requests WHERE id = ?", t.RequestID).Scan(&t.RequestTitle)
		db.DB.QueryRow("SELECT name FROM users WHERE id = ?", t.ResearcherID).Scan(&t.ResearcherName)
		tasks = append(tasks, t)
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Data: tasks})
}

// GET /api/research-tasks/{id}
func GetResearchTask(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)
	role := getUserRole(r)

	var t models.ResearchTask
	err := db.DB.QueryRow(`
		SELECT id, request_id, researcher_id, status, file_path, date_assigned,
		       deadline, completion_days, submitted_date,
		       archive_consent, archive_consent_date, archive_consent_notes,
		       created_at, updated_at
		FROM research_tasks WHERE id = ?
	`, id).Scan(&t.ID, &t.RequestID, &t.ResearcherID, &t.Status,
		&t.FilePath, &t.DateAssigned, &t.Deadline, &t.CompletionDays,
		&t.SubmittedDate, &t.ArchiveConsent, &t.ArchiveConsentDate,
		&t.ArchiveConsentNotes, &t.CreatedAt, &t.UpdatedAt)

	if err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Message: "المهمة غير موجودة",
		})
		return
	}

	// تحقق الملكية
	if role == "researcher" && t.ResearcherID != userID {
		writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح بعرض هذه المهمة"})
		return
	}
	if role == "department_head" {
		var userDept, resDept string
		db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", userID).Scan(&userDept)
		db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", t.ResearcherID).Scan(&resDept)
		if userDept != resDept {
			writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح بعرض هذه المهمة"})
			return
		}
	}

	// جلب طلبات المعلومات
	infoRows, _ := db.DB.Query(`
		SELECT id, research_task_id, number, target_entity, subject, status, attached_file, date_sent,
		       attempt_number, response_letter_number, response_date
		FROM information_requests WHERE research_task_id = ? ORDER BY date_sent
	`, id)
	if infoRows != nil {
		defer infoRows.Close()
		for infoRows.Next() {
			var ir models.InformationRequest
			if infoRows.Scan(&ir.ID, &ir.ResearchTaskID, &ir.Number, &ir.TargetEntity,
				&ir.Subject, &ir.Status, &ir.AttachedFile, &ir.DateSent,
				&ir.AttemptNumber, &ir.ResponseLetterNumber, &ir.ResponseDate) == nil {
				t.InformationRequests = append(t.InformationRequests, ir)
			}
		}
	}

	// جلب الملاحظات
	noteRows, _ := db.DB.Query(`
		SELECT id, entity_type, entity_id, user_id, user_name, content, created_at
		FROM notes WHERE entity_type = 'research_task' AND entity_id = ? ORDER BY created_at DESC
	`, id)
	if noteRows != nil {
		defer noteRows.Close()
		for noteRows.Next() {
			var n models.Note
			if noteRows.Scan(&n.ID, &n.EntityType, &n.EntityID, &n.UserID, &n.UserName, &n.Content, &n.CreatedAt) == nil {
				t.Notes = append(t.Notes, n)
			}
		}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Data: t})
}

// PUT /api/research-tasks/{id}/status
func UpdateResearchTaskStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)
	role := getUserRole(r)

	// تحقق الملكية
	var assignedResearcher int
	db.DB.QueryRow("SELECT researcher_id FROM research_tasks WHERE id = ?", id).Scan(&assignedResearcher)
	if role == "researcher" && assignedResearcher != userID {
		writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح بتعديل هذه المهمة"})
		return
	}
	if role == "department_head" {
		var userDept, resDept string
		db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", userID).Scan(&userDept)
		db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", assignedResearcher).Scan(&resDept)
		if userDept != resDept {
			writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح بتعديل هذه المهمة"})
			return
		}
	}

	var input struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}

	// تحقق من القيم المسموحة
	validStatuses := map[string]bool{"assigned": true, "in_progress": true, "sent_to_proofreader": true, "submitted": true, "completed": true, "returned": true}
	if !validStatuses[input.Status] {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "حالة غير صالحة"})
		return
	}

	now := time.Now()
	query := "UPDATE research_tasks SET status = ?, updated_at = ?"
	args := []interface{}{input.Status, now}

	if input.Status == "submitted" || input.Status == "completed" {
		query += ", submitted_date = ?"
		args = append(args, now)
	}

	query += " WHERE id = ?"
	args = append(args, id)

	db.DB.Exec(query, args...)

	// إذا أرسل للتدقيق، تحديث حالة الطلب
	if input.Status == "sent_to_proofreader" {
		var reqID string
		db.DB.QueryRow("SELECT request_id FROM research_tasks WHERE id = ?", id).Scan(&reqID)
		db.DB.Exec("UPDATE requests SET status = 'proofreading', updated_at = ? WHERE id = ?", now, reqID)
	}

	var userName string
	db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName)
	logActivity(userID, userName, "update_research_status", strPtr("research_task"), &id,
		fmt.Sprintf("تحديث حالة المهمة إلى %s", input.Status))

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Message: "تم تحديث حالة المهمة",
	})
}

// POST /api/research-tasks/{id}/info-requests
func CreateInfoRequest(w http.ResponseWriter, r *http.Request) {
	taskID := r.PathValue("id")
	userID := getUserID(r)

	// التحقق من الحد الأقصى (3 طلبات)
	var count int
	db.DB.QueryRow("SELECT COUNT(*) FROM information_requests WHERE research_task_id = ?", taskID).Scan(&count)
	if count >= 3 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "تم الوصول للحد الأقصى (3 طلبات معلومات)",
		})
		return
	}

	var input models.CreateInfoRequestInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}

	number := generateID("INF")
	attempt := count + 1

	_, err := db.DB.Exec(`
		INSERT INTO information_requests (research_task_id, number, target_entity, subject, status, date_sent, attempt_number)
		VALUES (?, ?, ?, ?, 'sent', ?, ?)
	`, taskID, number, input.TargetEntity, input.Subject, time.Now(), attempt)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل إنشاء طلب المعلومات",
		})
		return
	}

	var userName string
	db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName)
	logActivity(userID, userName, "create_info_request", strPtr("research_task"), &taskID,
		fmt.Sprintf("إنشاء طلب معلومات (محاولة %d/3) إلى %s", attempt, input.TargetEntity))

	writeJSON(w, http.StatusCreated, models.APIResponse{
		Success: true, Message: fmt.Sprintf("تم إنشاء طلب المعلومات (المحاولة %d من 3)", attempt),
		Data: map[string]interface{}{"attempt_number": attempt, "number": number},
	})
}

// PUT /api/information-requests/{id}/response - تحديث رد الجهة
func UpdateInfoRequestResponse(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	// تحقق الملكية: الباحث المسؤول عن المهمة
	var taskID string
	var assignedResearcher int
	db.DB.QueryRow(`
		SELECT ir.research_task_id, rt.researcher_id
		FROM information_requests ir
		JOIN research_tasks rt ON rt.id = ir.research_task_id
		WHERE ir.id = ?
	`, id).Scan(&taskID, &assignedResearcher)
	if assignedResearcher != userID {
		writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح بتعديل هذا الطلب"})
		return
	}

	var input struct {
		Status               string `json:"status"` // "received" | "no_response"
		ResponseLetterNumber string `json:"response_letter_number"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "بيانات غير صالحة"})
		return
	}
	if input.Status != "received" && input.Status != "no_response" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "الحالة يجب أن تكون received أو no_response"})
		return
	}
	if input.Status == "received" && input.ResponseLetterNumber == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "يجب إدخال رقم كتاب الرد"})
		return
	}

	now := time.Now()
	if input.Status == "received" {
		db.DB.Exec(`UPDATE information_requests SET status = ?, response_letter_number = ?, response_date = ? WHERE id = ?`,
			input.Status, input.ResponseLetterNumber, now, id)
	} else {
		db.DB.Exec(`UPDATE information_requests SET status = ?, response_date = ? WHERE id = ?`,
			input.Status, now, id)
	}

	var userName string
	db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName)
	details := fmt.Sprintf("تحديث رد الجهة: %s", input.Status)
	if input.Status == "received" {
		details = fmt.Sprintf("وصل رد الجهة - رقم الكتاب: %s", input.ResponseLetterNumber)
	}
	logActivity(userID, userName, "update_info_response", strPtr("research_task"), &taskID, details)

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم تحديث حالة الرد"})
}

// PUT /api/research-tasks/{id}/archive-consent - موافقة الباحث على الأرشفة
func UpdateArchiveConsent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	// تحقق الملكية
	var assignedResearcher int
	var requestID string
	db.DB.QueryRow("SELECT researcher_id, request_id FROM research_tasks WHERE id = ?", id).Scan(&assignedResearcher, &requestID)
	if assignedResearcher != userID {
		writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح بتعديل هذه المهمة"})
		return
	}

	// تأكد الطلب في مرحلة التسليم (المدير اعتمده)
	var reqStatus string
	db.DB.QueryRow("SELECT status FROM requests WHERE id = ?", requestID).Scan(&reqStatus)
	if reqStatus != "delivered" && reqStatus != "completed" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "الطلب ليس جاهزاً للأرشفة بعد"})
		return
	}

	var input struct {
		Consent string `json:"consent"` // "approved" | "rejected"
		Notes   string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "بيانات غير صالحة"})
		return
	}
	if input.Consent != "approved" && input.Consent != "rejected" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "القرار يجب أن يكون approved أو rejected"})
		return
	}

	now := time.Now()
	db.DB.Exec(`UPDATE research_tasks SET archive_consent = ?, archive_consent_date = ?, archive_consent_notes = ?, status = 'completed', updated_at = ? WHERE id = ?`,
		input.Consent, now, input.Notes, now, id)

	if input.Consent == "approved" {
		db.DB.Exec(`UPDATE requests SET archived = 1, archived_date = ?, status = 'completed', updated_at = ? WHERE id = ?`, now, now, requestID)
	} else {
		db.DB.Exec(`UPDATE requests SET archived = 0, status = 'completed', updated_at = ? WHERE id = ?`, now, requestID)
	}

	var userName string
	db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName)
	details := "رفض إرسال البحث للمستودع الرقمي"
	if input.Consent == "approved" {
		details = "موافقة على إرسال البحث للمستودع الرقمي"
	}
	logActivity(userID, userName, "archive_consent", strPtr("research_task"), &id, details)

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم تسجيل قرارك بشأن الأرشفة"})
}
