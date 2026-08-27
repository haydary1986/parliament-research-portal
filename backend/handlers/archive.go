package handlers

import (
	"net/http"

	"noab-backend/db"
	"noab-backend/models"
)

// GET /api/archive/search?q=&department=&committee=&from=&to=&page=&limit=
// يبحث في البحوث المُسلَّمة والمكتملة، مع فلاتر بالقسم واللجنة والفترة وترقيم صفحات
func SearchArchive(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	query := q.Get("q")
	department := q.Get("department")
	committee := q.Get("committee")
	from := q.Get("from")
	to := q.Get("to")
	page := getQueryInt(r, "page", 1)
	limit := getQueryInt(r, "limit", 20)
	offset := (page - 1) * limit

	// يجب وجود معيار واحد على الأقل حتى لا نُرجع الأرشيف كاملاً بلا قصد
	if query == "" && department == "" && committee == "" && from == "" && to == "" {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "يرجى إدخال كلمة بحث أو تحديد فلتر واحد على الأقل",
		})
		return
	}

	// المُسلَّم للجهة الطالبة أرشيف أيضاً — لا المكتمل وحده
	where := " WHERE r.status IN ('delivered','completed')"
	var args []interface{}

	if query != "" {
		term := "%" + query + "%"
		where += " AND (r.title LIKE ? OR r.description LIKE ? OR r.deputy_name LIKE ?)"
		args = append(args, term, term, term)
	}
	if department != "" {
		where += " AND r.assigned_department = ?"
		args = append(args, department)
	}
	if committee != "" {
		where += " AND r.committee LIKE ?"
		args = append(args, "%"+committee+"%")
	}
	if from != "" {
		where += " AND date(r.date_received) >= date(?)"
		args = append(args, from)
	}
	if to != "" {
		where += " AND date(r.date_received) <= date(?)"
		args = append(args, to)
	}

	var total int
	logErr("archive count", db.DB.QueryRow("SELECT COUNT(*) FROM requests r"+where, args...).Scan(&total))

	rows, err := db.DB.Query(`
		SELECT r.id, r.title, r.description, r.deputy_name, r.committee,
		       r.assigned_department, r.completed_date, r.status
		FROM requests r`+where+`
		ORDER BY COALESCE(r.completed_date, r.date_received) DESC
		LIMIT ? OFFSET ?
	`, append(args, limit, offset)...)

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

	results := []ArchiveResult{}
	for rows.Next() {
		var res ArchiveResult
		if rows.Scan(&res.ID, &res.Title, &res.Description, &res.DeputyName,
			&res.Committee, &res.Department, &res.CompletedDate, &res.Status) == nil {
			results = append(results, res)
		}
	}

	writeJSON(w, http.StatusOK, models.PaginatedResponse{
		Success: true, Data: results, Total: total, Page: page, Limit: limit,
	})
}
