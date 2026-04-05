package handlers

import (
	"encoding/json"
	"fmt"
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

	query := `SELECT pt.id, pt.research_task_id, pt.proofreader_id, pt.status,
		pt.notes, pt.file_path, pt.assigned_date, pt.completed_date
		FROM proofreading_tasks pt WHERE 1=1`
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

	var tasks []ProofreadingWithDetails
	for rows.Next() {
		var t ProofreadingWithDetails
		err := rows.Scan(&t.ID, &t.ResearchTaskID, &t.ProofreaderID, &t.Status,
			&t.Notes, &t.FilePath, &t.AssignedDate, &t.CompletedDate)
		if err != nil {
			continue
		}
		db.DB.QueryRow(`
			SELECT r.title, u.name FROM research_tasks rt
			JOIN requests r ON rt.request_id = r.id
			JOIN users u ON rt.researcher_id = u.id
			WHERE rt.id = ?
		`, t.ResearchTaskID).Scan(&t.RequestTitle, &t.ResearcherName)
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
	db.DB.QueryRow("SELECT proofreader_id FROM proofreading_tasks WHERE id = ?", id).Scan(&assignedProofreader)
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

	// تحقق من القيم المسموحة
	validStatuses := map[string]bool{"pending": true, "in_progress": true, "completed": true, "returned": true}
	if !validStatuses[input.Status] {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{Success: false, Message: "حالة غير صالحة"})
		return
	}

	now := time.Now()
	if input.Status == "completed" {
		db.DB.Exec(`
			UPDATE proofreading_tasks SET status = ?, notes = ?, completed_date = ?, updated_at = ?
			WHERE id = ?
		`, input.Status, input.Notes, now, now, id)

		// تحديث مهمة البحث والطلب
		var rtID string
		db.DB.QueryRow("SELECT research_task_id FROM proofreading_tasks WHERE id = ?", id).Scan(&rtID)
		db.DB.Exec("UPDATE research_tasks SET status = 'completed', updated_at = ? WHERE id = ?", now, rtID)

		var reqID string
		db.DB.QueryRow("SELECT request_id FROM research_tasks WHERE id = ?", rtID).Scan(&reqID)
		db.DB.Exec("UPDATE requests SET status = 'completed', completed_date = ?, updated_at = ? WHERE id = ?", now, now, reqID)
	} else if input.Status == "returned" {
		db.DB.Exec(`
			UPDATE proofreading_tasks SET status = ?, notes = ?, updated_at = ? WHERE id = ?
		`, input.Status, input.Notes, now, id)

		var rtID string
		db.DB.QueryRow("SELECT research_task_id FROM proofreading_tasks WHERE id = ?", id).Scan(&rtID)
		db.DB.Exec("UPDATE research_tasks SET status = 'returned', updated_at = ? WHERE id = ?", now, rtID)
	} else {
		db.DB.Exec("UPDATE proofreading_tasks SET status = ?, updated_at = ? WHERE id = ?", input.Status, now, id)
	}

	var userName string
	db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName)
	logActivity(userID, userName, "update_proofreading", strPtr("proofreading_task"), &id,
		fmt.Sprintf("تحديث حالة التدقيق إلى %s", input.Status))

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Message: "تم تحديث حالة التدقيق",
	})
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

	ptID := generateID("PT")

	_, err := db.DB.Exec(`
		INSERT INTO proofreading_tasks (id, research_task_id, proofreader_id, status)
		VALUES (?, ?, ?, 'pending')
	`, ptID, input.ResearchTaskID, input.ProofreaderID)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل إنشاء مهمة التدقيق",
		})
		return
	}

	// تحديث حالة مهمة البحث
	db.DB.Exec("UPDATE research_tasks SET status = 'sent_to_proofreader', updated_at = ? WHERE id = ?",
		time.Now(), input.ResearchTaskID)

	createNotification(input.ProofreaderID, "مهمة تدقيق جديدة",
		"تم تعيينك لتدقيق بحث جديد", "info", strPtr("proofreading_task"), &ptID)

	var userName string
	db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName)
	logActivity(userID, userName, "create_proofreading", strPtr("proofreading_task"), &ptID, "إنشاء مهمة تدقيق جديدة")

	writeJSON(w, http.StatusCreated, models.APIResponse{
		Success: true, Message: "تم إنشاء مهمة التدقيق بنجاح",
		Data: map[string]string{"id": ptID},
	})
}
