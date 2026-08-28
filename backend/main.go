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

	// ترحيل المخطط: يضيف الأعمدة الجديدة لقواعد البيانات القائمة
	// (schema.sql يستخدم CREATE TABLE IF NOT EXISTS فلا يُحدّث الجداول الموجودة)
	if err := db.Migrate(); err != nil {
		log.Fatalf("❌ فشل ترحيل قاعدة البيانات: %v", err)
	}

	if os.Getenv("NO_SEED") != "true" {
		if err := db.Seed(); err != nil {
			log.Printf("تحذير: فشل إدخال البيانات التجريبية: %v", err)
		}
	}

	// إعادة تعيين كلمة مرور admin من env var (مفيد للنشر الأولي)
	if err := db.ResetAdminPasswordIfRequested(); err != nil {
		log.Printf("تحذير: %v", err)
	}

	// القائمة السوداء الدائمة: تُحقن هنا لتفادي دورة استيراد بين
	// middleware و handlers، وبدونها تعود الرموز الملغاة صالحة بعد كل نشر
	middleware.RevokedChecker = handlers.IsTokenRevoked
	middleware.AccountChecker = handlers.CurrentAccount
	handlers.StartTokenCleanup()
	handlers.PurgeExpiredTokens()

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
	mux.Handle("PUT /api/notifications/read-all", auth(http.HandlerFunc(handlers.MarkAllNotificationsRead)))
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
	// إنشاء: الجهات الطالبة (نواب/رئاسات/لجان/رؤساء الكتل/مدراء/مستشارين — كلها role='deputy')
	mux.Handle("POST /api/requests", role("deputy")(http.HandlerFunc(handlers.CreateRequest)))
	// تعديل بيانات الطلب: المدير فقط
	mux.Handle("PUT /api/requests/{id}", role("manager")(http.HandlerFunc(handlers.UpdateRequest)))
	// إحالة لقسم (مع إمكانية تعيين الباحث مباشرةً): المدير فقط
	mux.Handle("PUT /api/requests/{id}/assign", role("manager")(http.HandlerFunc(handlers.AssignRequest)))
	// تأكيد وتعيين باحث(ين): رئيس القسم فقط
	mux.Handle("PUT /api/requests/{id}/confirm", role("department_head")(http.HandlerFunc(handlers.ConfirmRequest)))
	// إرجاع الطلب (بحث موجود): المدير فقط
	mux.Handle("PUT /api/requests/{id}/return", role("manager")(http.HandlerFunc(handlers.ReturnRequest)))
	// سحب الطلب: الجهة الطالبة، ما دام لم يُحَل بعد
	mux.Handle("PUT /api/requests/{id}/withdraw", role("deputy")(http.HandlerFunc(handlers.WithdrawRequest)))

	// رفض الطلب قبل الإحالة (سبب إلزامي)
	mux.Handle("PUT /api/requests/{id}/reject", role("manager")(http.HandlerFunc(handlers.RejectRequest)))

	// =============================================
	// Workflow الجديد (req.md)
	// =============================================
	// رئيس القسم يراجع البحث المسلَّم قبل إرساله للتدقيق اللغوي
	mux.Handle("PUT /api/requests/{id}/dept-review", role("department_head")(http.HandlerFunc(handlers.DeptHeadReviewSubmission)))
	// المعاون يدقق نهائياً
	mux.Handle("PUT /api/requests/{id}/assistant-review", role("assistant_manager")(http.HandlerFunc(handlers.AssistantFinalReview)))
	// رئيس القسم يرسل البحث العام للنائب طالب الخدمة
	mux.Handle("PUT /api/requests/{id}/dept-send", role("department_head")(http.HandlerFunc(handlers.DeptHeadSendToDeputy)))
	// مدير الدائرة يرسل البحث ذا الخصوصية للنائب
	mux.Handle("PUT /api/requests/{id}/manager-send", role("manager")(http.HandlerFunc(handlers.ManagerSendToDeputy)))
	// الباحث يربط ملف بمهمة بحثه
	mux.Handle("PUT /api/research-tasks/{id}/file", role("researcher")(http.HandlerFunc(handlers.AttachResearchFile)))
	// إعادة إسناد المهمة لباحث بديل: رئيس القسم أو مدير الدائرة
	mux.Handle("PUT /api/research-tasks/{id}/reassign", role("department_head", "manager")(http.HandlerFunc(handlers.ReassignResearchTask)))

	// =============================================
	// المستخدمين - Users
	// =============================================
	// عرض: أدمن + مدير + رئيس قسم
	mux.Handle("GET /api/users", role("admin", "manager", "department_head")(http.HandlerFunc(handlers.GetUsers)))
	mux.Handle("GET /api/users/{id}", role("admin", "manager", "department_head")(http.HandlerFunc(handlers.GetUser)))
	// إنشاء: أدمن (كل الأدوار) + رئيس قسم (باحث ومدقق فقط)
	mux.Handle("POST /api/users", role("admin", "department_head")(http.HandlerFunc(handlers.CreateUser)))
	// إنشاء عدة حسابات نواب بدفعة واحدة (admin only)
	mux.Handle("POST /api/users/bulk", role("admin")(http.HandlerFunc(handlers.BulkCreateUsers)))
	// تفعيل/تعطيل: أدمن + رئيس قسم (لموظفي قسمه)
	mux.Handle("PUT /api/users/{id}/status", role("admin", "department_head")(http.HandlerFunc(handlers.UpdateUserStatus)))
	// تعديل بيانات المستخدم: أدمن فقط (الحذف غير مدعوم — التعطيل بديله)
	mux.Handle("PUT /api/users/{id}", role("admin")(http.HandlerFunc(handlers.UpdateUser)))
	// إعادة تعيين كلمة مرور أي مستخدم: أدمن فقط
	mux.Handle("PUT /api/users/{id}/reset-password", role("admin")(http.HandlerFunc(handlers.AdminResetPassword)))

	// =============================================
	// الأقسام - Departments
	// =============================================
	mux.Handle("GET /api/departments", auth(http.HandlerFunc(handlers.GetDepartments)))
	mux.Handle("GET /api/departments/{id}", auth(http.HandlerFunc(handlers.GetDepartment)))
	// إدارة الأقسام: أدمن فقط
	mux.Handle("POST /api/departments", role("admin")(http.HandlerFunc(handlers.CreateDepartment)))
	mux.Handle("PUT /api/departments/{id}", role("admin")(http.HandlerFunc(handlers.UpdateDepartment)))
	mux.Handle("DELETE /api/departments/{id}", role("admin")(http.HandlerFunc(handlers.DeleteDepartment)))

	// =============================================
	// التقارير - Reports (مدير + أدمن)
	// =============================================
	mux.Handle("GET /api/reports/operations", role("manager", "admin")(http.HandlerFunc(handlers.GetOperationsReport)))
	mux.Handle("GET /api/reports/requests-export", role("manager", "admin")(http.HandlerFunc(handlers.ExportRequests)))

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
