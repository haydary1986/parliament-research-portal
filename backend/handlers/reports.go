package handlers

import (
	"net/http"
	"time"

	"noab-backend/db"
	"noab-backend/models"
)

// =============================================
// التقارير التشغيلية لمدير الدائرة
// =============================================

// DepartmentLoad حِمل قسم واحد
type DepartmentLoad struct {
	DepartmentID   string  `json:"department_id"`
	DepartmentName string  `json:"department_name"`
	Active         int     `json:"active"`
	Completed      int     `json:"completed"`
	Overdue        int     `json:"overdue"`
	Researchers    int     `json:"researchers"`
	AvgDays        float64 `json:"avg_days"`
}

// ResearcherLoad حِمل باحث واحد
type ResearcherLoad struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	Department string `json:"department"`
	Active     int    `json:"active"`
	Completed  int    `json:"completed"`
	Overdue    int    `json:"overdue"`
}

// OperationsReport التقرير التشغيلي الكامل
type OperationsReport struct {
	GeneratedAt  time.Time        `json:"generated_at"`
	ByStatus     map[string]int   `json:"by_status"`
	ByCommittee  map[string]int   `json:"by_committee"`
	ByRequester  map[string]int   `json:"by_requester_type"`
	Overdue      int              `json:"overdue"`
	AvgDays      float64          `json:"avg_completion_days"`
	Departments  []DepartmentLoad `json:"departments"`
	Researchers  []ResearcherLoad `json:"researchers"`
	OverdueItems []models.Request `json:"overdue_items"`
}

// GET /api/reports/operations - تقرير أداء الدائرة (مدير + أدمن)
func GetOperationsReport(w http.ResponseWriter, r *http.Request) {
	rep := OperationsReport{
		GeneratedAt: time.Now(),
		ByStatus:    map[string]int{},
		ByCommittee: map[string]int{},
		ByRequester: map[string]int{},
	}

	// توزيع الحالات
	if rows, err := db.DB.Query("SELECT status, COUNT(*) FROM requests GROUP BY status"); err == nil {
		for rows.Next() {
			var s string
			var n int
			if rows.Scan(&s, &n) == nil {
				rep.ByStatus[s] = n
			}
		}
		rows.Close()
	}

	// توزيع اللجان (أعلى 15)
	if rows, err := db.DB.Query(`
		SELECT COALESCE(committee, 'غير محدد'), COUNT(*) FROM requests
		GROUP BY committee ORDER BY COUNT(*) DESC LIMIT 15
	`); err == nil {
		for rows.Next() {
			var c string
			var n int
			if rows.Scan(&c, &n) == nil {
				rep.ByCommittee[c] = n
			}
		}
		rows.Close()
	}

	// توزيع الجهات الطالبة
	if rows, err := db.DB.Query(`
		SELECT COALESCE(requester_type, 'deputy'), COUNT(*) FROM requests GROUP BY requester_type
	`); err == nil {
		for rows.Next() {
			var t string
			var n int
			if rows.Scan(&t, &n) == nil {
				rep.ByRequester[t] = n
			}
		}
		rows.Close()
	}

	// المتأخرة: تجاوزت الموعد النهائي ولم تُسلَّم بعد
	logErr("report overdue", db.DB.QueryRow(`
		SELECT COUNT(*) FROM requests
		WHERE deadline IS NOT NULL AND deadline < CURRENT_TIMESTAMP
		  AND status NOT IN ('delivered','completed','returned_exists','rejected')
	`).Scan(&rep.Overdue))

	// متوسط مدة الإنجاز بالأيام
	logErr("report avg days", db.DB.QueryRow(`
		SELECT COALESCE(AVG(julianday(completed_date) - julianday(date_received)), 0)
		FROM requests WHERE completed_date IS NOT NULL
	`).Scan(&rep.AvgDays))

	// حِمل الأقسام
	if rows, err := db.DB.Query(`
		SELECT d.id, d.name,
		  (SELECT COUNT(*) FROM requests q WHERE q.assigned_department = d.id
		     AND q.status NOT IN ('delivered','completed','returned_exists','rejected')),
		  (SELECT COUNT(*) FROM requests q WHERE q.assigned_department = d.id
		     AND q.status IN ('delivered','completed')),
		  (SELECT COUNT(*) FROM requests q WHERE q.assigned_department = d.id
		     AND q.deadline IS NOT NULL AND q.deadline < CURRENT_TIMESTAMP
		     AND q.status NOT IN ('delivered','completed','returned_exists','rejected')),
		  (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.role = 'researcher'),
		  (SELECT COALESCE(AVG(julianday(q.completed_date) - julianday(q.date_received)), 0)
		     FROM requests q WHERE q.assigned_department = d.id AND q.completed_date IS NOT NULL)
		FROM departments d ORDER BY d.name
	`); err == nil {
		for rows.Next() {
			var d DepartmentLoad
			if rows.Scan(&d.DepartmentID, &d.DepartmentName, &d.Active, &d.Completed,
				&d.Overdue, &d.Researchers, &d.AvgDays) == nil {
				rep.Departments = append(rep.Departments, d)
			}
		}
		rows.Close()
	}

	// حِمل الباحثين
	if rows, err := db.DB.Query(`
		SELECT u.id, u.name, COALESCE(d.name, '—'),
		  (SELECT COUNT(*) FROM research_tasks t WHERE t.researcher_id = u.id
		     AND t.status NOT IN ('completed','returned')),
		  (SELECT COUNT(*) FROM research_tasks t WHERE t.researcher_id = u.id AND t.status = 'completed'),
		  (SELECT COUNT(*) FROM research_tasks t WHERE t.researcher_id = u.id
		     AND t.deadline IS NOT NULL AND t.deadline < CURRENT_TIMESTAMP
		     AND t.status NOT IN ('completed','returned'))
		FROM users u LEFT JOIN departments d ON d.id = u.department_id
		WHERE u.role = 'researcher' AND u.status = 'active'
		ORDER BY u.name
	`); err == nil {
		for rows.Next() {
			var x ResearcherLoad
			if rows.Scan(&x.ID, &x.Name, &x.Department, &x.Active, &x.Completed, &x.Overdue) == nil {
				rep.Researchers = append(rep.Researchers, x)
			}
		}
		rows.Close()
	}

	// تفاصيل الطلبات المتأخرة
	if rows, err := db.DB.Query(`
		SELECT id, title, deputy_name, committee, status, assigned_department, date_received, deadline
		FROM requests
		WHERE deadline IS NOT NULL AND deadline < CURRENT_TIMESTAMP
		  AND status NOT IN ('delivered','completed','returned_exists','rejected')
		ORDER BY deadline ASC LIMIT 100
	`); err == nil {
		for rows.Next() {
			var q models.Request
			if rows.Scan(&q.ID, &q.Title, &q.DeputyName, &q.Committee, &q.Status,
				&q.AssignedDepartment, &q.DateReceived, &q.Deadline) == nil {
				rep.OverdueItems = append(rep.OverdueItems, q)
			}
		}
		rows.Close()
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Data: rep})
}

// GET /api/reports/requests-export - تصدير كل الطلبات (مدير + أدمن)
// يُرجع صفوفاً مسطّحة جاهزة للتحويل إلى Excel في الواجهة
func ExportRequests(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query(`
		SELECT q.id, q.title, COALESCE(q.deputy_name,''), COALESCE(q.requester_type,'deputy'),
		       COALESCE(q.committee,''), COALESCE(q.purpose,''), q.status,
		       COALESCE(q.confidentiality,'public'), COALESCE(d.name,''),
		       q.date_received, q.deadline, q.completed_date,
		       COALESCE(c.service_type,''), COALESCE(c.classification,''),
		       COALESCE(GROUP_CONCAT(DISTINCT u.name), '')
		FROM requests q
		LEFT JOIN departments d ON d.id = q.assigned_department
		LEFT JOIN request_confirmations c ON c.request_id = q.id
		LEFT JOIN research_tasks t ON t.request_id = q.id
		LEFT JOIN users u ON u.id = t.researcher_id
		GROUP BY q.id
		ORDER BY q.date_received DESC
	`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل تجهيز التصدير"})
		return
	}
	defer rows.Close()

	type ExportRow struct {
		ID             string     `json:"id"`
		Title          string     `json:"title"`
		Requester      string     `json:"requester"`
		RequesterType  string     `json:"requester_type"`
		Committee      string     `json:"committee"`
		Purpose        string     `json:"purpose"`
		Status         string     `json:"status"`
		Confidential   string     `json:"confidentiality"`
		Department     string     `json:"department"`
		DateReceived   time.Time  `json:"date_received"`
		Deadline       *time.Time `json:"deadline"`
		CompletedDate  *time.Time `json:"completed_date"`
		ServiceType    string     `json:"service_type"`
		Classification string     `json:"classification"`
		Researchers    string     `json:"researchers"`
	}

	out := []ExportRow{}
	for rows.Next() {
		var e ExportRow
		if rows.Scan(&e.ID, &e.Title, &e.Requester, &e.RequesterType, &e.Committee,
			&e.Purpose, &e.Status, &e.Confidential, &e.Department,
			&e.DateReceived, &e.Deadline, &e.CompletedDate,
			&e.ServiceType, &e.Classification, &e.Researchers) == nil {
			out = append(out, e)
		}
	}

	writeJSON(w, http.StatusOK, models.APIResponse{Success: true, Data: out})
}
