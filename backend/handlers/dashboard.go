package handlers

import (
	"encoding/json"
	"net/http"

	"noab-backend/db"
	"noab-backend/models"
)

// GET /api/dashboard/stats
func GetDashboardStats(w http.ResponseWriter, r *http.Request) {
	var stats models.DashboardStats

	db.DB.QueryRow("SELECT COUNT(*) FROM requests").Scan(&stats.TotalRequests)
	db.DB.QueryRow("SELECT COUNT(*) FROM requests WHERE status = 'pending'").Scan(&stats.PendingRequests)
	db.DB.QueryRow("SELECT COUNT(*) FROM requests WHERE status IN ('assigned', 'confirmed', 'in_progress', 'review', 'proofreading')").Scan(&stats.InProgressCount)
	db.DB.QueryRow("SELECT COUNT(*) FROM requests WHERE status = 'completed'").Scan(&stats.CompletedRequests)
	db.DB.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'researcher'").Scan(&stats.TotalResearchers)
	db.DB.QueryRow("SELECT COUNT(*) FROM departments").Scan(&stats.TotalDepartments)

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Data: stats})
}

// GET /api/activity-logs
func GetActivityLogs(w http.ResponseWriter, r *http.Request) {
	page := getQueryInt(r, "page", 1)
	limit := getQueryInt(r, "limit", 50)
	offset := (page - 1) * limit

	var total int
	db.DB.QueryRow("SELECT COUNT(*) FROM activity_logs").Scan(&total)

	rows, err := db.DB.Query(`
		SELECT id, user_id, user_name, action, entity_type, entity_id, details, ip_address, created_at
		FROM activity_logs ORDER BY created_at DESC LIMIT ? OFFSET ?
	`, limit, offset)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "خطأ في جلب سجل النشاطات",
		})
		return
	}
	defer rows.Close()

	var logs []models.ActivityLog
	for rows.Next() {
		var l models.ActivityLog
		if rows.Scan(&l.ID, &l.UserID, &l.UserName, &l.Action, &l.EntityType,
			&l.EntityID, &l.Details, &l.IPAddress, &l.CreatedAt) == nil {
			logs = append(logs, l)
		}
	}

	writeJSON(w, http.StatusOK, models.PaginatedResponse{
		Success: true, Data: logs, Total: total, Page: page, Limit: limit,
	})
}

// GET /api/notifications
func GetNotifications(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)

	rows, err := db.DB.Query(`
		SELECT id, user_id, title, message, type, is_read, entity_type, entity_id, created_at
		FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
	`, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "خطأ في جلب الإشعارات",
		})
		return
	}
	defer rows.Close()

	var notifications []models.Notification
	for rows.Next() {
		var n models.Notification
		if rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Message, &n.Type,
			&n.IsRead, &n.EntityType, &n.EntityID, &n.CreatedAt) == nil {
			notifications = append(notifications, n)
		}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Data: notifications})
}

// PUT /api/notifications/{id}/read
func MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := getUserID(r)

	db.DB.Exec("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", id, userID)

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Message: "تم تحديث الإشعار",
	})
}

// POST /api/notes
func CreateNote(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	role := getUserRole(r)

	var input struct {
		EntityType string `json:"entity_type"`
		EntityID   string `json:"entity_id"`
		Content    string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}

	// تحقق من صحة المدخلات
	validTypes := map[string]bool{"request": true, "research_task": true, "proofreading_task": true}
	if !validTypes[input.EntityType] || input.EntityID == "" || input.Content == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "بيانات غير صالحة",
		})
		return
	}

	// تحقق من الوصول للـ entity
	switch input.EntityType {
	case "request":
		if role == "deputy" {
			var deputyID *int
			db.DB.QueryRow("SELECT deputy_id FROM requests WHERE id = ?", input.EntityID).Scan(&deputyID)
			if deputyID == nil || *deputyID != userID {
				writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح"})
				return
			}
		}
	case "research_task":
		if role == "researcher" {
			var resID int
			db.DB.QueryRow("SELECT researcher_id FROM research_tasks WHERE id = ?", input.EntityID).Scan(&resID)
			if resID != userID {
				writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح"})
				return
			}
		} else if role == "deputy" {
			writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح"})
			return
		}
	case "proofreading_task":
		if role == "proofreader" {
			var proofID int
			db.DB.QueryRow("SELECT proofreader_id FROM proofreading_tasks WHERE id = ?", input.EntityID).Scan(&proofID)
			if proofID != userID {
				writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح"})
				return
			}
		} else if role == "deputy" || role == "researcher" {
			writeJSON(w, http.StatusForbidden, models.APIResponse{Success: false, Message: "غير مصرح"})
			return
		}
	}

	var userName string
	db.DB.QueryRow("SELECT name FROM users WHERE id = ?", userID).Scan(&userName)

	_, err := db.DB.Exec(`
		INSERT INTO notes (entity_type, entity_id, user_id, user_name, content)
		VALUES (?, ?, ?, ?, ?)
	`, input.EntityType, input.EntityID, userID, userName, sanitize(input.Content))

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل إضافة الملاحظة",
		})
		return
	}

	writeJSON(w, http.StatusCreated, models.APIResponse{
		Success: true, Message: "تمت إضافة الملاحظة بنجاح",
	})
}
