package handlers

import (
	"net/http"

	"noab-backend/db"
	"noab-backend/models"
)

// GET /api/departments
func GetDepartments(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query(`
		SELECT d.id, d.name, d.head_name,
			(SELECT COUNT(*) FROM users WHERE department_id = d.id AND role = 'researcher') as researcher_count,
			(SELECT COUNT(*) FROM requests WHERE assigned_department = d.id AND status NOT IN ('completed', 'rejected')) as active_requests,
			d.color
		FROM departments d ORDER BY d.name
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "خطأ في جلب الأقسام",
		})
		return
	}
	defer rows.Close()

	var departments []models.Department
	for rows.Next() {
		var d models.Department
		if rows.Scan(&d.ID, &d.Name, &d.HeadName, &d.ResearcherCount, &d.ActiveRequests, &d.Color) == nil {
			departments = append(departments, d)
		}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Data: departments})
}

// GET /api/departments/{id}
func GetDepartment(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var d models.Department
	err := db.DB.QueryRow(`
		SELECT d.id, d.name, d.head_name,
			(SELECT COUNT(*) FROM users WHERE department_id = d.id AND role = 'researcher'),
			(SELECT COUNT(*) FROM requests WHERE assigned_department = d.id AND status NOT IN ('completed', 'rejected')),
			d.color
		FROM departments d WHERE d.id = ?
	`, id).Scan(&d.ID, &d.Name, &d.HeadName, &d.ResearcherCount, &d.ActiveRequests, &d.Color)

	if err != nil {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Message: "القسم غير موجود",
		})
		return
	}

	// جلب باحثي القسم
	resRows, _ := db.DB.Query(`
		SELECT id, name, email, specialization, status
		FROM users WHERE department_id = ? AND role = 'researcher'
	`, id)

	type ResearcherInfo struct {
		ID             int     `json:"id"`
		Name           string  `json:"name"`
		Email          string  `json:"email"`
		Specialization *string `json:"specialization"`
		Status         string  `json:"status"`
		ActiveTasks    int     `json:"active_tasks"`
	}

	var researchers []ResearcherInfo
	if resRows != nil {
		defer resRows.Close()
		for resRows.Next() {
			var ri ResearcherInfo
			if resRows.Scan(&ri.ID, &ri.Name, &ri.Email, &ri.Specialization, &ri.Status) == nil {
				db.DB.QueryRow(`
					SELECT COUNT(*) FROM research_tasks
					WHERE researcher_id = ? AND status NOT IN ('completed', 'returned')
				`, ri.ID).Scan(&ri.ActiveTasks)
				researchers = append(researchers, ri)
			}
		}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"department":  d,
			"researchers": researchers,
		},
	})
}
