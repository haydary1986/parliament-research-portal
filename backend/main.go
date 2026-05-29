package main

import (
	"log"
	"net/http"
	"os"

	"noab-backend/db"
	"noab-backend/handlers"
	"noab-backend/middleware"
)

func main() {
	dbPath := "noab.db"
	if p := os.Getenv("DB_PATH"); p != "" {
		dbPath = p
	}

	middleware.InitJWT()
	middleware.StartBlacklistCleanup()

	if err := db.Init(dbPath); err != nil {
		log.Fatal(err)
	}

	if os.Getenv("NO_SEED") != "true" {
		if err := db.Seed(); err != nil {
			log.Printf("تحذير: فشل إدخال البيانات التجريبية: %v", err)
		}
	}

	mux := http.NewServeMux()

	auth := middleware.Auth
	role := middleware.AuthWithRole

	// =============================================
	// عام - Public
	// =============================================
	mux.Handle("POST /api/auth/login", middleware.RateLimit(http.HandlerFunc(handlers.Login)))

	// Health check endpoint للـ Docker/Kubernetes — لا يتطلب مصادقة
	mux.HandleFunc("GET /api/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// =============================================
	// أي مستخدم مسجل - Any Authenticated User
	// =============================================
	mux.Handle("GET /api/notifications", auth(http.HandlerFunc(handlers.GetNotifications)))
	mux.Handle("PUT /api/notifications/{id}/read", auth(http.HandlerFunc(handlers.MarkNotificationRead)))
	mux.Handle("PUT /api/auth/change-password", auth(http.HandlerFunc(handlers.ChangePassword)))

	// =============================================
	// لوحة التحكم - Dashboard (مدير + أدمن)
	// =============================================
	mux.Handle("GET /api/dashboard/stats", role("admin", "manager")(http.HandlerFunc(handlers.GetDashboardStats)))

	// =============================================
	// الطلبات - Requests
	// =============================================
	// عرض: النائب يرى طلباته، المدير يرى الكل، القسم يرى طلبات قسمه
	mux.Handle("GET /api/requests", auth(http.HandlerFunc(handlers.GetRequests)))
	mux.Handle("GET /api/requests/{id}", auth(http.HandlerFunc(handlers.GetRequest)))
	// إنشاء: النواب فقط
	mux.Handle("POST /api/requests", role("deputy")(http.HandlerFunc(handlers.CreateRequest)))
	// إحالة لقسم: المدير فقط
	mux.Handle("PUT /api/requests/{id}/assign", role("manager")(http.HandlerFunc(handlers.AssignRequest)))
	// تأكيد وتعيين باحث(ين): رئيس القسم فقط
	mux.Handle("PUT /api/requests/{id}/confirm", role("department_head")(http.HandlerFunc(handlers.ConfirmRequest)))
	// إرجاع الطلب (بحث موجود): المدير فقط
	mux.Handle("PUT /api/requests/{id}/return", role("manager")(http.HandlerFunc(handlers.ReturnRequest)))
	// المراجعة النهائية واعتماد البحث (القديم - للحفاظ على التوافق): المدير فقط
	mux.Handle("PUT /api/requests/{id}/final-review", role("manager")(http.HandlerFunc(handlers.FinalReviewRequest)))

	// =============================================
	// Workflow الجديد (req.md)
	// =============================================
	// رئيس القسم يراجع البحث المسلَّم قبل إرساله للتدقيق اللغوي
	mux.Handle("PUT /api/requests/{id}/dept-review", role("department_head")(http.HandlerFunc(handlers.DeptHeadReviewSubmission)))
	// المعاون يدقق نهائياً
	mux.Handle("PUT /api/requests/{id}/assistant-review", role("assistant_manager")(http.HandlerFunc(handlers.AssistantFinalReview)))
	// رئيس القسم يرسل البحث للنائب طالب الخدمة
	mux.Handle("PUT /api/requests/{id}/dept-send", role("department_head")(http.HandlerFunc(handlers.DeptHeadSendToDeputy)))
	// الباحث يحيل البحث للمعاون للتدقيق النهائي
	mux.Handle("PUT /api/research-tasks/{id}/refer-assistant", role("researcher")(http.HandlerFunc(handlers.ReferToAssistant)))

	// =============================================
	// المستخدمين - Users
	// =============================================
	// عرض: أدمن + مدير + رئيس قسم
	mux.Handle("GET /api/users", role("admin", "manager", "department_head")(http.HandlerFunc(handlers.GetUsers)))
	mux.Handle("GET /api/users/{id}", role("admin", "manager", "department_head")(http.HandlerFunc(handlers.GetUser)))
	// إنشاء: أدمن (كل الأدوار) + رئيس قسم (باحث ومدقق فقط)
	mux.Handle("POST /api/users", role("admin", "department_head")(http.HandlerFunc(handlers.CreateUser)))
	// تفعيل/تعطيل: أدمن + رئيس قسم (لموظفي قسمه)
	mux.Handle("PUT /api/users/{id}/status", role("admin", "department_head")(http.HandlerFunc(handlers.UpdateUserStatus)))
	// إعادة تعيين كلمة مرور أي مستخدم: أدمن فقط
	mux.Handle("PUT /api/users/{id}/reset-password", role("admin")(http.HandlerFunc(handlers.AdminResetPassword)))

	// =============================================
	// الأقسام - Departments
	// =============================================
	mux.Handle("GET /api/departments", auth(http.HandlerFunc(handlers.GetDepartments)))
	mux.Handle("GET /api/departments/{id}", auth(http.HandlerFunc(handlers.GetDepartment)))

	// =============================================
	// المهام البحثية - Research Tasks
	// =============================================
	mux.Handle("GET /api/research-tasks", role("researcher", "department_head", "manager", "assistant_manager", "admin")(http.HandlerFunc(handlers.GetResearchTasks)))
	mux.Handle("GET /api/research-tasks/{id}", role("researcher", "department_head", "manager", "assistant_manager", "admin")(http.HandlerFunc(handlers.GetResearchTask)))
	mux.Handle("PUT /api/research-tasks/{id}/status", role("researcher", "department_head")(http.HandlerFunc(handlers.UpdateResearchTaskStatus)))
	mux.Handle("POST /api/research-tasks/{id}/info-requests", role("researcher")(http.HandlerFunc(handlers.CreateInfoRequest)))
	// تحديث رد الجهة على كتاب المعلومات
	mux.Handle("PUT /api/information-requests/{id}/response", role("researcher")(http.HandlerFunc(handlers.UpdateInfoRequestResponse)))
	// موافقة الباحث على إرسال البحث للمستودع الرقمي
	mux.Handle("PUT /api/research-tasks/{id}/archive-consent", role("researcher")(http.HandlerFunc(handlers.UpdateArchiveConsent)))

	// =============================================
	// التدقيق - Proofreading
	// =============================================
	mux.Handle("GET /api/proofreading-tasks", role("proofreader", "department_head", "manager", "admin")(http.HandlerFunc(handlers.GetProofreadingTasks)))
	mux.Handle("POST /api/proofreading-tasks", role("department_head")(http.HandlerFunc(handlers.CreateProofreadingTask)))
	mux.Handle("PUT /api/proofreading-tasks/{id}/status", role("proofreader")(http.HandlerFunc(handlers.UpdateProofreadingStatus)))

	// =============================================
	// الملاحظات - Notes (أي مستخدم مسجل)
	// =============================================
	mux.Handle("POST /api/notes", auth(http.HandlerFunc(handlers.CreateNote)))

	// =============================================
	// سجل النشاطات - Activity Logs (أدمن + مدير)
	// =============================================
	mux.Handle("GET /api/activity-logs", role("admin", "manager")(http.HandlerFunc(handlers.GetActivityLogs)))

	// =============================================
	// رفع الملفات - File Upload
	// =============================================
	mux.Handle("POST /api/upload", auth(http.HandlerFunc(handlers.UploadFile)))
	mux.Handle("GET /api/files/{filename}", auth(http.HandlerFunc(handlers.ServeFile)))

	// =============================================
	// البحث في الأرشيف - Archive Search
	// =============================================
	mux.Handle("GET /api/archive/search", role("manager", "admin")(http.HandlerFunc(handlers.SearchArchive)))

	// تسجيل خروج + أمان
	mux.Handle("POST /api/auth/logout", auth(http.HandlerFunc(handlers.Logout)))
	mux.Handle("GET /api/security/stats", role("admin")(http.HandlerFunc(handlers.GetSecurityStats)))

	handler := middleware.Logger(middleware.CORS(middleware.BodyLimit(mux)))

	port := ":8080"
	if p := os.Getenv("PORT"); p != "" {
		port = ":" + p
	}

	tlsCert := os.Getenv("TLS_CERT")
	tlsKey := os.Getenv("TLS_KEY")

	// إذا وجدت شهادات TLS، استخدم HTTPS
	if tlsCert != "" && tlsKey != "" {
		log.Printf("🔒 السيرفر يعمل بـ HTTPS على https://localhost%s", port)
		log.Printf("📋 API متاح على https://localhost%s/api", port)
		log.Fatal(http.ListenAndServeTLS(port, tlsCert, tlsKey, handler))
	} else if _, err := os.Stat("certs/cert.pem"); err == nil {
		// شهادات محلية للتطوير
		log.Printf("🔒 السيرفر يعمل بـ HTTPS (شهادة تطوير) على https://localhost%s", port)
		log.Printf("📋 API متاح على https://localhost%s/api", port)
		log.Fatal(http.ListenAndServeTLS(port, "certs/cert.pem", "certs/key.pem", handler))
	} else {
		log.Printf("⚠️  تحذير: يعمل بـ HTTP بدون تشفير!")
		log.Printf("🚀 السيرفر يعمل على http://localhost%s", port)
		log.Fatal(http.ListenAndServe(port, handler))
	}
}
