package handlers

import (
	"net/http"

	"noab-backend/db"
	"noab-backend/models"
)

// GET /api/archive/search?q=keyword
func SearchArchive(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "يرجى إدخال كلمة البحث",
		})
		return
	}

	searchTerm := "%" + query + "%"

	rows, err := db.DB.Query(`
		SELECT r.id, r.title, r.description, r.deputy_name, r.committee,
		       r.assigned_department, r.completed_date, r.status
		FROM requests r
		WHERE r.status = 'completed'
		  AND (r.title LIKE ? OR r.description LIKE ?)
		ORDER BY r.completed_date DESC
		LIMIT 20
	`, searchTerm, searchTerm)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "خطأ في البحث",
		})
		return
	}
	defer rows.Close()

	type ArchiveResult struct {
		ID            string  `json:"id"`
		Title         string  `json:"title"`
		Description   *string `json:"description"`
		DeputyName    *string `json:"deputy_name"`
		Committee     *string `json:"committee"`
		Department    *string `json:"department"`
		CompletedDate *string `json:"completed_date"`
		Status        string  `json:"status"`
	}

	var results []ArchiveResult
	for rows.Next() {
		var r ArchiveResult
		if rows.Scan(&r.ID, &r.Title, &r.Description, &r.DeputyName,
			&r.Committee, &r.Department, &r.CompletedDate, &r.Status) == nil {
			results = append(results, r)
		}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true, Data: results,
	})
}
