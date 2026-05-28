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

// GET /api/research-tasks - استعلام واحد بـ JOIN بدلاً من N+1
func GetResearchTasks(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	role := getUserRole(r)
	status := r.URL.Query().Get("status")

	query := `
		SELECT rt.id, rt.request_id, rt.researcher_id, rt.status,
		       rt.file_path, rt.date_assigned, rt.deadline, rt.completion_days,
		       rt.submitted_date, rt.archive_consent, rt.archive_consent_date,
		       rt.archive_consent_notes, rt.created_at, rt.updated_at,
		       COALESCE(req.title, ''), COALESCE(u.name, '')
		FROM research_tasks rt
		LEFT JOIN requests req ON req.id = rt.request_id
		LEFT JOIN users u ON u.id = rt.researcher_id
		WHERE 1=1`
	var args []interface{}

	switch role {
	case "researcher":
		query += " AND rt.researcher_id = ?"
		args = append(args, userID)
	case "department_head":
		var deptID sql.NullString
		logErr("GetResearchTasks dept lookup",
			db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", userID).Scan(&deptID))
		query += " AND u.department_id = ?"
		args = append(args, deptID.String)
	}

	if status != "" {
		query += " AND rt.status = ?"
		args = append(args, status)
	}

	query += " ORDER BY rt.created_at DESC"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		log.Printf("GetResearchTasks query failed: %v", err)
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

	tasks := []ResearchTaskWithDetails{}
	for rows.Next() {
		var t ResearchTaskWithDetails
		if err := rows.Scan(&t.ID, &t.RequestID, &t.ResearcherID, &t.Status,
			&t.FilePath, &t.DateAssigned, &t.Deadline, &t.CompletionDays,
			&t.SubmittedDate, &t.ArchiveConsent, &t.ArchiveConsentDate,
			&t.ArchiveConsentNotes, &t.CreatedAt, &t.UpdatedAt,
			&t.RequestTitle, &t.ResearcherName); err != nil {
			log.Printf("GetResearchTasks scan: %v", err)
			continue
		}
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
	if err := db.DB.QueryRow("SELECT researcher_id FROM research_tasks WHERE id = ?", id).Scan(&assignedResearcher); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "المهمة غير موجودة"})
		return
	}
	if role == "researcher" && assignedResearcher != userID {
		writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح بتعديل هذه المهمة"})
		return
	}
	if role == "department_head" {
		var userDept, resDept sql.NullString
		logErr("dept lookup user", db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", userID).Scan(&userDept))
		logErr("dept lookup researcher", db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", assignedResearcher).Scan(&resDept))
		if !userDept.Valid || !resDept.Valid || userDept.String != resDept.String {
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

	validStatuses := map[string]bool{"assigned": true, "in_progress": true, "sent_to_proofreader": true, "submitted": true, "completed": true, "returned": true}
	if !validStatuses[input.Status] {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "حالة غير صالحة"})
		return
	}

	var userName string
	logErr("UpdateResearchTaskStatus userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()
		query := "UPDATE research_tasks SET status = ?, updated_at = ?"
		args := []interface{}{input.Status, now}
		if input.Status == "submitted" || input.Status == "completed" {
			query += ", submitted_date = ?"
			args = append(args, now)
		}
		query += " WHERE id = ?"
		args = append(args, id)

		if _, err := tx.Exec(query, args...); err != nil {
			return fmt.Errorf("UPDATE research_task: %w", err)
		}

		// Workflow الجديد (req.md - بوابة الباحث):
		// عند submitted: الطلب → pending_dept_review (يدقّقه رئيس القسم أولاً)
		if input.Status == "submitted" {
			var reqID string
			if err := tx.QueryRow("SELECT request_id FROM research_tasks WHERE id = ?", id).Scan(&reqID); err != nil {
				return fmt.Errorf("lookup request_id: %w", err)
			}
			if _, err := tx.Exec("UPDATE requests SET status = 'pending_dept_review', updated_at = ? WHERE id = ?", now, reqID); err != nil {
				return fmt.Errorf("UPDATE requests: %w", err)
			}
			// إشعار رئيس القسم
			var deptID string
			if err := tx.QueryRow(`
				SELECT u.department_id FROM users u
				JOIN research_tasks rt ON rt.researcher_id = u.id
				WHERE rt.id = ?
			`, id).Scan(&deptID); err == nil && deptID != "" {
				headRows, _ := tx.Query("SELECT id FROM users WHERE department_id = ? AND role = 'department_head' AND status = 'active'", deptID)
				if headRows != nil {
					var heads []int
					for headRows.Next() {
						var h int
						if headRows.Scan(&h) == nil {
							heads = append(heads, h)
						}
					}
					headRows.Close()
					for _, h := range heads {
						if err := createNotificationTx(tx, h, "بحث جاهز للمراجعة",
							fmt.Sprintf("الباحث سلّم بحث الطلب %s — يرجى مراجعته", reqID),
							"info", strPtr("request"), &reqID); err != nil {
							return err
						}
					}
				}
			}
		}

		// متوافق مع القديم: لو تم استخدام sent_to_proofreader مباشرة
		if input.Status == "sent_to_proofreader" {
			var reqID string
			if err := tx.QueryRow("SELECT request_id FROM research_tasks WHERE id = ?", id).Scan(&reqID); err != nil {
				return fmt.Errorf("lookup request_id: %w", err)
			}
			if _, err := tx.Exec("UPDATE requests SET status = 'proofreading', updated_at = ? WHERE id = ?", now, reqID); err != nil {
				return fmt.Errorf("UPDATE requests: %w", err)
			}
		}

		return logActivityTx(tx, userID, userName, "update_research_status", strPtr("research_task"), &id,
			fmt.Sprintf("تحديث حالة المهمة إلى %s", input.Status))
	})

	if txErr != nil {
		log.Printf("UpdateResearchTaskStatus tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل تحديث الحالة"})
		return
	}

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
	if input.TargetEntity == "" || input.Subject == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "يرجى تحديد الجهة والموضوع"})
		return
	}

	number := generateID("INF")
	attempt := count + 1

	_, err := db.DB.Exec(`
		INSERT INTO information_requests (research_task_id, number, target_entity, subject, status, date_sent, attempt_number)
		VALUES (?, ?, ?, ?, 'sent', ?, ?)
	`, taskID, number, sanitize(input.TargetEntity), sanitize(input.Subject), time.Now(), attempt)

	if err != nil {
		log.Printf("CreateInfoRequest INSERT failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل إنشاء طلب المعلومات",
		})
		return
	}

	var userName string
	logErr("CreateInfoRequest userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))
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
	var execErr error
	if input.Status == "received" {
		_, execErr = db.DB.Exec(`UPDATE information_requests SET status = ?, response_letter_number = ?, response_date = ? WHERE id = ?`,
			input.Status, sanitize(input.ResponseLetterNumber), now, id)
	} else {
		_, execErr = db.DB.Exec(`UPDATE information_requests SET status = ?, response_date = ? WHERE id = ?`,
			input.Status, now, id)
	}
	if execErr != nil {
		log.Printf("UpdateInfoRequestResponse UPDATE failed: %v", execErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل تحديث الرد"})
		return
	}

	var userName string
	logErr("UpdateInfoRequestResponse userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))
	details := fmt.Sprintf("تحديث رد الجهة: %s", input.Status)
	if input.Status == "received" {
		details = fmt.Sprintf("وصل رد الجهة - رقم الكتاب: %s", input.ResponseLetterNumber)
	}
	logActivity(userID, userName, "update_info_response", strPtr("research_task"), &taskID, details)

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم تحديث حالة الرد"})
}

// PUT /api/research-tasks/{id}/refer-assistant - الباحث يحيل للمعاون للتدقيق النهائي
// (نقطة 4 من بوابة الباحث في req.md)
func ReferToAssistant(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	var assignedResearcher int
	var requestID string
	if err := db.DB.QueryRow("SELECT researcher_id, request_id FROM research_tasks WHERE id = ?", id).Scan(&assignedResearcher, &requestID); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "المهمة غير موجودة"})
		return
	}
	if assignedResearcher != userID {
		writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح بهذه العملية"})
		return
	}

	// يجب أن يكون التدقيق اللغوي قد انتهى أولاً
	var reqStatus string
	logErr("ReferToAssistant status", db.DB.QueryRow("SELECT status FROM requests WHERE id = ?", requestID).Scan(&reqStatus))
	if reqStatus != "proofreading" && reqStatus != "in_progress" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "لا يمكن الإحالة إلى المعاون قبل إكمال التدقيق اللغوي",
		})
		return
	}

	var userName string
	logErr("ReferToAssistant userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()
		if _, err := tx.Exec("UPDATE requests SET status = 'pending_assistant', updated_at = ? WHERE id = ?", now, requestID); err != nil {
			return fmt.Errorf("UPDATE requests: %w", err)
		}

		// إشعار كل المعاونين النشطين
		rows, err := tx.Query("SELECT id FROM users WHERE role = 'assistant_manager' AND status = 'active'")
		if err != nil {
			return fmt.Errorf("lookup assistants: %w", err)
		}
		var assistants []int
		for rows.Next() {
			var aid int
			if rows.Scan(&aid) == nil {
				assistants = append(assistants, aid)
			}
		}
		rows.Close()
		for _, aid := range assistants {
			if err := createNotificationTx(tx, aid, "بحث جاهز للتدقيق النهائي",
				fmt.Sprintf("الباحث أحال الطلب %s إليكم للتدقيق النهائي", requestID),
				"info", strPtr("request"), &requestID); err != nil {
				return err
			}
		}

		return logActivityTx(tx, userID, userName, "refer_to_assistant", strPtr("research_task"), &id,
			"إحالة البحث للمعاون للتدقيق النهائي")
	})

	if txErr != nil {
		log.Printf("ReferToAssistant tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل الإحالة"})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تمت الإحالة إلى المعاون"})
}

// PUT /api/requests/{id}/assistant-review - المعاون يدقق نهائياً
// (نقطة 4 من بوابة الباحث: التدقيق النهائي من المعاون)
func AssistantFinalReview(w http.ResponseWriter, r *http.Request) {
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
	if currentStatus != "pending_assistant" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "الطلب ليس بانتظار المعاون"})
		return
	}

	var userName string
	logErr("AssistantFinalReview userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))
	cleanNotes := sanitize(input.Notes)

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()

		if input.Decision == "approve" {
			// اعتماد المعاون → يرجع لرئيس القسم لإرساله للنائب
			if _, err := tx.Exec(`
				UPDATE requests SET status = 'pending_dept_send',
				       assistant_review_by = ?, assistant_review_date = ?, updated_at = ?
				WHERE id = ?
			`, userID, now, now, id); err != nil {
				return fmt.Errorf("UPDATE requests: %w", err)
			}

			// إشعار رئيس القسم المسؤول
			var deptID sql.NullString
			if err := tx.QueryRow("SELECT assigned_department FROM requests WHERE id = ?", id).Scan(&deptID); err != nil {
				return fmt.Errorf("lookup department: %w", err)
			}
			if deptID.Valid {
				headRows, _ := tx.Query(
					"SELECT id FROM users WHERE department_id = ? AND role = 'department_head' AND status = 'active'",
					deptID.String)
				if headRows != nil {
					var heads []int
					for headRows.Next() {
						var h int
						if headRows.Scan(&h) == nil {
							heads = append(heads, h)
						}
					}
					headRows.Close()
					for _, h := range heads {
						if err := createNotificationTx(tx, h, "بحث جاهز للإرسال للنائب",
							fmt.Sprintf("المعاون اعتمد بحث الطلب %s. يرجى إرساله للنائب طالب الخدمة", id),
							"success", strPtr("request"), &id); err != nil {
							return err
						}
					}
				}
			}
			return logActivityTx(tx, userID, userName, "assistant_approve", strPtr("request"), &id, "اعتماد المعاون النهائي")
		}

		// رفض: يرجع للباحث
		if _, err := tx.Exec("UPDATE requests SET status = 'in_progress', updated_at = ? WHERE id = ?", now, id); err != nil {
			return fmt.Errorf("UPDATE requests: %w", err)
		}

		note := cleanNotes
		if note == "" {
			note = "رفض التدقيق النهائي من المعاون - يرجى المراجعة"
		}
		if _, err := tx.Exec(
			`INSERT INTO notes (entity_type, entity_id, user_id, user_name, content) VALUES ('request', ?, ?, ?, ?)`,
			id, userID, userName, note,
		); err != nil {
			return fmt.Errorf("INSERT note: %w", err)
		}

		// إشعار الباحث(ين)
		researcherRows, _ := tx.Query("SELECT DISTINCT researcher_id FROM research_tasks WHERE request_id = ?", id)
		if researcherRows != nil {
			var researchers []int
			for researcherRows.Next() {
				var rid int
				if researcherRows.Scan(&rid) == nil {
					researchers = append(researchers, rid)
				}
			}
			researcherRows.Close()
			for _, rid := range researchers {
				if err := createNotificationTx(tx, rid, "رجوع البحث من المعاون",
					fmt.Sprintf("المعاون رفض التدقيق النهائي للطلب %s: %s", id, note),
					"warning", strPtr("request"), &id); err != nil {
					return err
				}
			}
		}
		return logActivityTx(tx, userID, userName, "assistant_reject", strPtr("request"), &id, "رفض المعاون - إرجاع للباحث")
	})

	if txErr != nil {
		log.Printf("AssistantFinalReview tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل تسجيل القرار"})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم تسجيل قرارك"})
}

// PUT /api/requests/{id}/dept-send - رئيس القسم يرسل البحث المعتمد للنائب
// (آخر مرحلة في الـ workflow الجديد)
func DeptHeadSendToDeputy(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	// التحقق من أن المستخدم رئيس قسم الطلب
	var assignedDept sql.NullString
	var status string
	if err := db.DB.QueryRow("SELECT assigned_department, status FROM requests WHERE id = ?", id).Scan(&assignedDept, &status); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "الطلب غير موجود"})
		return
	}
	if status != "pending_dept_send" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "الطلب ليس جاهزاً للإرسال للنائب"})
		return
	}
	var userDept sql.NullString
	logErr("DeptHeadSend user lookup", db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", userID).Scan(&userDept))
	if !assignedDept.Valid || !userDept.Valid || assignedDept.String != userDept.String {
		writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "هذا الطلب لا يخص قسمك"})
		return
	}

	var userName string
	logErr("DeptHeadSend userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()
		if _, err := tx.Exec(`
			UPDATE requests SET status = 'delivered', completed_date = ?,
			       delivered_to_deputy_date = ?, final_review_by = ?, final_review_date = ?, updated_at = ?
			WHERE id = ?
		`, now, now, userID, now, now, id); err != nil {
			return fmt.Errorf("UPDATE requests: %w", err)
		}

		// إشعار النائب — بريد إلكتروني/SMS placeholder
		// نقطة 4 من بوابة النواب: إشعار يرسل لرقم موبايل النائب
		var deputyID int
		var deputyPhone sql.NullString
		if err := tx.QueryRow("SELECT deputy_id, phone FROM requests WHERE id = ?", id).Scan(&deputyID, &deputyPhone); err != nil && err != sql.ErrNoRows {
			return fmt.Errorf("lookup deputy: %w", err)
		}
		if deputyID > 0 {
			if err := createNotificationTx(tx, deputyID, "تم تسليم البحث",
				fmt.Sprintf("تم الانتهاء من بحث طلبك %s وتسليمه إليكم", id),
				"success", strPtr("request"), &id); err != nil {
				return err
			}
		}
		if deputyPhone.Valid && deputyPhone.String != "" {
			// hook لإشعار SMS — حالياً log فقط (تكامل SMS gateway مستقبلي)
			log.Printf("📱 SMS إشعار اكتمال البحث للنائب: %s — الطلب %s", deputyPhone.String, id)
		}

		// إشعار الباحث(ين) لأخذ موافقتهم على الأرشفة
		researcherRows, _ := tx.Query("SELECT DISTINCT id, researcher_id FROM research_tasks WHERE request_id = ?", id)
		if researcherRows != nil {
			type pair struct{ taskID string; researcherID int }
			var pairs []pair
			for researcherRows.Next() {
				var p pair
				if researcherRows.Scan(&p.taskID, &p.researcherID) == nil {
					pairs = append(pairs, p)
				}
			}
			researcherRows.Close()
			for _, p := range pairs {
				tID := p.taskID
				if err := createNotificationTx(tx, p.researcherID, "يرجى الموافقة على الأرشفة",
					fmt.Sprintf("تم تسليم بحثك للنائب. حدد موافقتك على الأرشفة (مهمة %s)", tID),
					"info", strPtr("research_task"), &tID); err != nil {
					return err
				}
			}
		}

		return logActivityTx(tx, userID, userName, "dept_send_to_deputy", strPtr("request"), &id, "إرسال البحث المعتمد للنائب")
	})

	if txErr != nil {
		log.Printf("DeptHeadSendToDeputy tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل الإرسال للنائب"})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم إرسال البحث للنائب"})
}

// PUT /api/research-tasks/{id}/archive-consent - موافقة الباحث على الأرشفة
func UpdateArchiveConsent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	var assignedResearcher int
	var requestID string
	if err := db.DB.QueryRow("SELECT researcher_id, request_id FROM research_tasks WHERE id = ?", id).Scan(&assignedResearcher, &requestID); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "المهمة غير موجودة"})
		return
	}
	if assignedResearcher != userID {
		writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح بتعديل هذه المهمة"})
		return
	}

	var reqStatus string
	logErr("UpdateArchiveConsent status lookup", db.DB.QueryRow("SELECT status FROM requests WHERE id = ?", requestID).Scan(&reqStatus))
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

	cleanNotes := sanitize(input.Notes)
	var userName string
	logErr("UpdateArchiveConsent userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()
		if _, err := tx.Exec(`UPDATE research_tasks SET archive_consent = ?, archive_consent_date = ?, archive_consent_notes = ?, status = 'completed', updated_at = ? WHERE id = ?`,
			input.Consent, now, cleanNotes, now, id); err != nil {
			return fmt.Errorf("UPDATE research_task: %w", err)
		}

		if input.Consent == "approved" {
			if _, err := tx.Exec(`UPDATE requests SET archived = 1, archived_date = ?, status = 'completed', updated_at = ? WHERE id = ?`, now, now, requestID); err != nil {
				return fmt.Errorf("UPDATE requests (approved): %w", err)
			}
		} else {
			if _, err := tx.Exec(`UPDATE requests SET archived = 0, status = 'completed', updated_at = ? WHERE id = ?`, now, requestID); err != nil {
				return fmt.Errorf("UPDATE requests (rejected): %w", err)
			}
		}

		details := "رفض إرسال البحث للمستودع الرقمي"
		if input.Consent == "approved" {
			details = "موافقة على إرسال البحث للمستودع الرقمي"
		}
		return logActivityTx(tx, userID, userName, "archive_consent", strPtr("research_task"), &id, details)
	})

	if txErr != nil {
		log.Printf("UpdateArchiveConsent tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل تسجيل القرار"})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم تسجيل قرارك بشأن الأرشفة"})
}
