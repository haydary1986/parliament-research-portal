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

// GET /api/proofreading-tasks
func GetProofreadingTasks(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	role := getUserRole(r)
	status := r.URL.Query().Get("status")

	// استعلام JOIN واحد بدلاً من N+1
	query := `
		SELECT pt.id, pt.research_task_id, pt.proofreader_id, pt.status,
		       pt.notes, pt.file_path, pt.assigned_date, pt.completed_date,
		       COALESCE(r.title, ''), COALESCE(u.name, '')
		FROM proofreading_tasks pt
		LEFT JOIN research_tasks rt ON rt.id = pt.research_task_id
		LEFT JOIN requests r ON r.id = rt.request_id
		LEFT JOIN users u ON u.id = rt.researcher_id
		WHERE 1=1`
	var args []interface{}

	if role == "proofreader" {
		query += " AND pt.proofreader_id = ?"
		args = append(args, userID)
	}
	if status != "" {
		query += " AND pt.status = ?"
		args = append(args, status)
	}
	query += " ORDER BY pt.assigned_date DESC"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		log.Printf("GetProofreadingTasks query failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "خطأ في جلب مهام التدقيق",
		})
		return
	}
	defer rows.Close()

	type ProofreadingWithDetails struct {
		models.ProofreadingTask
		RequestTitle   string `json:"request_title"`
		ResearcherName string `json:"researcher_name"`
	}

	tasks := []ProofreadingWithDetails{}
	for rows.Next() {
		var t ProofreadingWithDetails
		if err := rows.Scan(&t.ID, &t.ResearchTaskID, &t.ProofreaderID, &t.Status,
			&t.Notes, &t.FilePath, &t.AssignedDate, &t.CompletedDate,
			&t.RequestTitle, &t.ResearcherName); err != nil {
			log.Printf("GetProofreadingTasks scan: %v", err)
			continue
		}
		tasks = append(tasks, t)
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Data: tasks})
}

// PUT /api/proofreading-tasks/{id}/status
func UpdateProofreadingStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	// تحقق الملكية - المدقق يعدل مهامه فقط
	var assignedProofreader int
	if err := db.DB.QueryRow("SELECT proofreader_id FROM proofreading_tasks WHERE id = ?", id).Scan(&assignedProofreader); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "المهمة غير موجودة"})
		return
	}
	if assignedProofreader != userID {
		writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح بتعديل هذه المهمة"})
		return
	}

	var input struct {
		Status string  `json:"status"`
		Notes  *string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}

	validStatuses := map[string]bool{"pending": true, "in_progress": true, "completed": true, "returned": true}
	if !validStatuses[input.Status] {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "حالة غير صالحة"})
		return
	}

	cleanNotes := sanitizePtr(input.Notes)

	var userName string
	logErr("UpdateProofreadingStatus userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()

		switch input.Status {
		case "completed":
			if _, err := tx.Exec(`
				UPDATE proofreading_tasks SET status = ?, notes = ?, completed_date = ?, updated_at = ?
				WHERE id = ?
			`, input.Status, cleanNotes, now, now, id); err != nil {
				return fmt.Errorf("UPDATE proofreading: %w", err)
			}

			var rtID, reqID string
			var researcherID int
			if err := tx.QueryRow("SELECT research_task_id FROM proofreading_tasks WHERE id = ?", id).Scan(&rtID); err != nil {
				return fmt.Errorf("lookup research_task_id: %w", err)
			}
			// بعد التدقيق اللغوي: المهمة جاهزة، الباحث سيحيلها للمعاون يدوياً (workflow جديد)
			if _, err := tx.Exec("UPDATE research_tasks SET status = 'submitted', updated_at = ? WHERE id = ?", now, rtID); err != nil {
				return fmt.Errorf("UPDATE research_task: %w", err)
			}
			if err := tx.QueryRow("SELECT request_id, researcher_id FROM research_tasks WHERE id = ?", rtID).Scan(&reqID, &researcherID); err != nil {
				return fmt.Errorf("lookup request: %w", err)
			}
			// نعيد الطلب لحالة in_progress حتى يستطيع الباحث الإحالة للمعاون
			if _, err := tx.Exec("UPDATE requests SET status = 'in_progress', updated_at = ? WHERE id = ?", now, reqID); err != nil {
				return fmt.Errorf("UPDATE requests: %w", err)
			}

			// إشعار الباحث ليحيله للمعاون (req.md - workflow جديد)
			if researcherID > 0 {
				if err := createNotificationTx(tx, researcherID, "تم التدقيق اللغوي",
					fmt.Sprintf("تم إتمام التدقيق اللغوي للطلب %s. يرجى إحالته إلى المعاون للتدقيق النهائي.", reqID),
					"success", strPtr("request"), &reqID); err != nil {
					return err
				}
			}

		case "returned":
			if _, err := tx.Exec(`
				UPDATE proofreading_tasks SET status = ?, notes = ?, updated_at = ? WHERE id = ?
			`, input.Status, cleanNotes, now, id); err != nil {
				return fmt.Errorf("UPDATE proofreading: %w", err)
			}
			var rtID string
			if err := tx.QueryRow("SELECT research_task_id FROM proofreading_tasks WHERE id = ?", id).Scan(&rtID); err != nil {
				return fmt.Errorf("lookup research_task_id: %w", err)
			}
			if _, err := tx.Exec("UPDATE research_tasks SET status = 'returned', updated_at = ? WHERE id = ?", now, rtID); err != nil {
				return fmt.Errorf("UPDATE research_task: %w", err)
			}

		default:
			if _, err := tx.Exec("UPDATE proofreading_tasks SET status = ?, updated_at = ? WHERE id = ?", input.Status, now, id); err != nil {
				return fmt.Errorf("UPDATE proofreading: %w", err)
			}
		}

		return logActivityTx(tx, userID, userName, "update_proofreading", strPtr("proofreading_task"), &id,
			fmt.Sprintf("تحديث حالة التدقيق إلى %s", input.Status))
	})

	if txErr != nil {
		log.Printf("UpdateProofreadingStatus tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل تحديث الحالة"})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Message: "تم تحديث حالة التدقيق",
	})
}

// PUT /api/requests/{id}/dept-review - مراجعة رئيس القسم للبحث المسلم
// (نقطة 4 من بوابة الباحث: تدقيقه من رئيس القسم قبل التدقيق اللغوي)
// قرار approve → ينشئ proofreading_task ويرسل للمدقق
// قرار reject  → يرجع للباحث
func DeptHeadReviewSubmission(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	var input struct {
		Decision      string `json:"decision"` // "approve" | "reject"
		ProofreaderID int    `json:"proofreader_id"`
		Notes         string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "بيانات غير صالحة"})
		return
	}
	if input.Decision != "approve" && input.Decision != "reject" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "القرار يجب أن يكون approve أو reject"})
		return
	}
	if input.Decision == "approve" && input.ProofreaderID == 0 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "اختر المدقق اللغوي"})
		return
	}

	// التحقق أن الطلب لقسم رئيس القسم وأنه في حالة pending_dept_review
	var assignedDept sql.NullString
	var status string
	if err := db.DB.QueryRow("SELECT assigned_department, status FROM requests WHERE id = ?", id).Scan(&assignedDept, &status); err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{Success: false, Message: "الطلب غير موجود"})
		return
	}
	if status != "pending_dept_review" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "الطلب ليس بانتظار مراجعة رئيس القسم"})
		return
	}
	var userDept sql.NullString
	logErr("DeptReview user lookup", db.DB.QueryRow("SELECT department_id FROM users WHERE id = ?", userID).Scan(&userDept))
	if !assignedDept.Valid || !userDept.Valid || assignedDept.String != userDept.String {
		writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "هذا الطلب لا يخص قسمك"})
		return
	}

	var userName string
	logErr("DeptReview userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))
	cleanNotes := sanitize(input.Notes)

	txErr := withTx(func(tx *sql.Tx) error {
		now := time.Now()

		if input.Decision == "approve" {
			// نقل الطلب إلى proofreading + إنشاء مهمة تدقيق
			if _, err := tx.Exec("UPDATE requests SET status = 'proofreading', updated_at = ? WHERE id = ?", now, id); err != nil {
				return fmt.Errorf("UPDATE requests: %w", err)
			}

			// إنشاء proofreading_task لأحدث research_task مكتملة (المسلَّمة)
			var rtID string
			if err := tx.QueryRow(`
				SELECT id FROM research_tasks
				WHERE request_id = ? AND status IN ('submitted', 'completed')
				ORDER BY submitted_date DESC LIMIT 1
			`, id).Scan(&rtID); err != nil {
				return fmt.Errorf("lookup research_task: %w", err)
			}

			ptID := generateID("PT")
			if _, err := tx.Exec(`
				INSERT INTO proofreading_tasks (id, research_task_id, proofreader_id, status)
				VALUES (?, ?, ?, 'pending')
			`, ptID, rtID, input.ProofreaderID); err != nil {
				return fmt.Errorf("INSERT proofreading: %w", err)
			}
			if _, err := tx.Exec("UPDATE research_tasks SET status = 'sent_to_proofreader', updated_at = ? WHERE id = ?",
				now, rtID); err != nil {
				return fmt.Errorf("UPDATE research_task: %w", err)
			}

			if err := createNotificationTx(tx, input.ProofreaderID, "مهمة تدقيق جديدة",
				fmt.Sprintf("تم تعيينك لتدقيق بحث الطلب %s", id),
				"info", strPtr("proofreading_task"), &ptID); err != nil {
				return err
			}
			return logActivityTx(tx, userID, userName, "dept_review_approve", strPtr("request"), &id, "اعتماد رئيس القسم + إرسال للتدقيق اللغوي")
		}

		// رفض → يرجع للباحث
		if _, err := tx.Exec("UPDATE requests SET status = 'in_progress', updated_at = ? WHERE id = ?", now, id); err != nil {
			return fmt.Errorf("UPDATE requests: %w", err)
		}
		var researcherID int
		_ = tx.QueryRow(`
			SELECT researcher_id FROM research_tasks WHERE request_id = ?
			ORDER BY date_assigned DESC LIMIT 1
		`, id).Scan(&researcherID)

		note := cleanNotes
		if note == "" {
			note = "رفض رئيس القسم - يرجى التعديل"
		}
		if _, err := tx.Exec(
			`INSERT INTO notes (entity_type, entity_id, user_id, user_name, content) VALUES ('request', ?, ?, ?, ?)`,
			id, userID, userName, note,
		); err != nil {
			return fmt.Errorf("INSERT note: %w", err)
		}
		if researcherID > 0 {
			if err := createNotificationTx(tx, researcherID, "رجوع البحث للمراجعة",
				fmt.Sprintf("رئيس القسم رفض البحث للطلب %s: %s", id, note),
				"warning", strPtr("request"), &id); err != nil {
				return err
			}
		}
		return logActivityTx(tx, userID, userName, "dept_review_reject", strPtr("request"), &id, "رفض رئيس القسم - إرجاع للباحث")
	})

	if txErr != nil {
		log.Printf("DeptHeadReviewSubmission tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل تسجيل القرار"})
		return
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Message: "تم تسجيل قرارك"})
}

// POST /api/proofreading-tasks
func CreateProofreadingTask(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)

	var input struct {
		ResearchTaskID string `json:"research_task_id"`
		ProofreaderID  int    `json:"proofreader_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}
	if input.ResearchTaskID == "" || input.ProofreaderID == 0 {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "يرجى تحديد مهمة البحث والمدقق"})
		return
	}

	ptID := generateID("PT")
	var userName string
	logErr("CreateProofreadingTask userName", db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName))

	txErr := withTx(func(tx *sql.Tx) error {
		if _, err := tx.Exec(`
			INSERT INTO proofreading_tasks (id, research_task_id, proofreader_id, status)
			VALUES (?, ?, ?, 'pending')
		`, ptID, input.ResearchTaskID, input.ProofreaderID); err != nil {
			return fmt.Errorf("INSERT proofreading: %w", err)
		}
		if _, err := tx.Exec("UPDATE research_tasks SET status = 'sent_to_proofreader', updated_at = ? WHERE id = ?",
			time.Now(), input.ResearchTaskID); err != nil {
			return fmt.Errorf("UPDATE research_task: %w", err)
		}
		if err := createNotificationTx(tx, input.ProofreaderID, "مهمة تدقيق جديدة",
			"تم تعيينك لتدقيق بحث جديد", "info", strPtr("proofreading_task"), &ptID); err != nil {
			return err
		}
		return logActivityTx(tx, userID, userName, "create_proofreading", strPtr("proofreading_task"), &ptID, "إنشاء مهمة تدقيق جديدة")
	})

	if txErr != nil {
		log.Printf("CreateProofreadingTask tx failed: %v", txErr)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل إنشاء مهمة التدقيق",
		})
		return
	}

	writeJSON(w, http.StatusCreated, models.APIResponse{
		Success: true, Message: "تم إنشاء مهمة التدقيق بنجاح",
		Data: map[string]string{"id": ptID},
	})
}
