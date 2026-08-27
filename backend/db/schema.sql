-- منصة البحوث البرلمانية - مخطط قاعدة البيانات
-- Parliamentary Research Portal - Database Schema

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- =============================================
-- جدول الأقسام - Departments
-- =============================================
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    head_name TEXT,
    researcher_count INTEGER DEFAULT 0,
    active_requests INTEGER DEFAULT 0,
    color TEXT DEFAULT '#3b82f6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- جدول المستخدمين - Users
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('deputy', 'manager', 'department_head', 'researcher', 'proofreader', 'assistant_manager', 'admin')),
    department_id TEXT REFERENCES departments(id),
    deputy_id TEXT,
    -- نوع الجهة الطالبة: نواب، رئاسات، لجان، رؤساء الكتل، مدراء، مستشارين
    -- كلها تحمل role='deputy' وتستخدم بوابة تقديم الطلبات نفسها
    requester_type TEXT DEFAULT 'deputy',
    committee TEXT,
    phone TEXT,
    specialization TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- لجان النواب - User Committees (M:N)
-- النائب الواحد قد يكون عضواً في عدة لجان نيابية
-- =============================================
CREATE TABLE IF NOT EXISTS user_committees (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    committee TEXT NOT NULL,
    is_primary INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, committee)
);
CREATE INDEX IF NOT EXISTS idx_user_committees_user ON user_committees(user_id);

-- =============================================
-- جدول الصلاحيات - Permissions
-- =============================================
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT
);

-- =============================================
-- صلاحيات المستخدمين - User Permissions
-- =============================================
CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, permission_id)
);

-- =============================================
-- جدول الطلبات - Requests
-- =============================================
CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    deputy_id INTEGER REFERENCES users(id),
    deputy_name TEXT,
    committee TEXT,
    purpose TEXT CHECK (purpose IN ('oversight', 'legislative', 'other')),
    phone TEXT,
    email TEXT,
    -- إضافة 'pending_dept_review', 'pending_assistant', 'pending_dept_send' للـ workflow الجديد
    -- و 'pending_manager_send' لمسار البحوث ذات الخصوصية (تُرسل للنائب عبر مدير الدائرة)
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'assigned', 'confirmed', 'in_progress', 'review',
        'pending_dept_review', 'proofreading',
        'pending_assistant', 'pending_dept_send', 'pending_manager_send',
        'delivered', 'completed', 'returned_exists', 'rejected'
    )),
    -- يبقى للقسم الرئيسي (متوافق مع القديم) - متعدد الأقسام في request_departments
    assigned_department TEXT REFERENCES departments(id),
    -- موافقة النائب على نشر/توزيع البحث (نقطة 3 من بوابة النواب)
    can_share INTEGER DEFAULT 0,
    -- تصنيف السرية: يحدده الطالب عند التقديم، ويستطيع المعاون تعديله عند التدقيق النهائي
    -- 'public' → يوجَّه عبر رئيس القسم | 'confidential' → يوجَّه عبر مدير الدائرة
    confidentiality TEXT DEFAULT 'public' CHECK (confidentiality IN ('public', 'confidential')),
    -- نوع الجهة الطالبة وقت التقديم (نسخة تاريخية من users.requester_type)
    requester_type TEXT DEFAULT 'deputy',
    date_received DATETIME DEFAULT CURRENT_TIMESTAMP,
    deadline DATETIME,
    referral_date DATETIME,
    completed_date DATETIME,
    existing_research_id TEXT,
    delivered_to_deputy_date DATETIME,
    archived INTEGER DEFAULT 0,
    archived_date DATETIME,
    final_review_by INTEGER REFERENCES users(id),
    final_review_date DATETIME,
    -- المعاون يدقق نهائياً (workflow جديد)
    assistant_review_by INTEGER REFERENCES users(id),
    assistant_review_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- إحالات الطلب إلى أقسام متعددة - Request Departments (M:N)
-- نقطة 1 من بوابة المدير: يمكن إحالة نفس الطلب لأكثر من قسم
-- =============================================
CREATE TABLE IF NOT EXISTS request_departments (
    request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
    department_id TEXT REFERENCES departments(id) ON DELETE CASCADE,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (request_id, department_id)
);

-- =============================================
-- تأكيد الطلبات - Request Confirmations
-- =============================================
CREATE TABLE IF NOT EXISTS request_confirmations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT UNIQUE REFERENCES requests(id) ON DELETE CASCADE,
    service_type TEXT CHECK (service_type IN ('دراسة', 'تقرير', 'ورقة إحاطة', 'بيان رأي', 'سؤال نيابي')),
    classification TEXT CHECK (classification IN ('علمي', 'اجتماعي', 'سياسي', 'قانوني', 'مالية واقتصادية')),
    completion_days INTEGER,
    confirmed_by INTEGER REFERENCES users(id),
    confirmed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- مهام البحث - Research Tasks
-- =============================================
CREATE TABLE IF NOT EXISTS research_tasks (
    id TEXT PRIMARY KEY,
    request_id TEXT REFERENCES requests(id) ON DELETE CASCADE,
    researcher_id INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'sent_to_proofreader', 'submitted', 'completed', 'returned')),
    file_path TEXT,
    date_assigned DATETIME DEFAULT CURRENT_TIMESTAMP,
    deadline DATETIME,
    completion_days INTEGER,
    submitted_date DATETIME,
    archive_consent TEXT CHECK (archive_consent IN ('approved', 'rejected')),
    archive_consent_date DATETIME,
    archive_consent_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- طلبات المعلومات - Information Requests
-- =============================================
CREATE TABLE IF NOT EXISTS information_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    research_task_id TEXT REFERENCES research_tasks(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'received', 'no_response')),
    attached_file TEXT,
    date_sent DATETIME DEFAULT CURRENT_TIMESTAMP,
    attempt_number INTEGER DEFAULT 1,
    response_letter_number TEXT,
    response_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- مهام التدقيق - Proofreading Tasks
-- =============================================
CREATE TABLE IF NOT EXISTS proofreading_tasks (
    id TEXT PRIMARY KEY,
    research_task_id TEXT REFERENCES research_tasks(id) ON DELETE CASCADE,
    proofreader_id INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'returned')),
    notes TEXT,
    file_path TEXT,
    assigned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- الملاحظات - Notes
-- =============================================
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('request', 'research_task', 'proofreading_task')),
    entity_id TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    user_name TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- سجل النشاطات - Activity Log
-- =============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- الإشعارات - Notifications
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read INTEGER DEFAULT 0,
    entity_type TEXT,
    entity_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- الرموز الملغاة - Revoked Tokens
-- تبقى القائمة السوداء صالحة بعد إعادة التشغيل والنشر،
-- وإلا عادت الرموز المسجَّل خروجها صالحة عند كل نشر
-- =============================================
-- expires_at بالثواني منذ 1970 (لا DATETIME): المقارنة النصية بـ CURRENT_TIMESTAMP
-- غير موثوقة لأن الدرايفر يكتب RFC3339 بينما CURRENT_TIMESTAMP بصيغة UTC مختلفة
CREATE TABLE IF NOT EXISTS revoked_tokens (
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_exp ON revoked_tokens(expires_at);

-- =============================================
-- محاولات الدخول الفاشلة - Login Attempts
-- تُستخدم لقفل الحساب (لا الـ IP وحده) ولبقاء الحظر بعد إعادة التشغيل
-- =============================================
CREATE TABLE IF NOT EXISTS login_attempts (
    email TEXT PRIMARY KEY,
    fail_count INTEGER DEFAULT 0,
    locked_until DATETIME,
    last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- الفهارس - Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_deputy ON requests(deputy_id);
CREATE INDEX IF NOT EXISTS idx_requests_department ON requests(assigned_department);
CREATE INDEX IF NOT EXISTS idx_research_tasks_request ON research_tasks(request_id);
CREATE INDEX IF NOT EXISTS idx_research_tasks_researcher ON research_tasks(researcher_id);
CREATE INDEX IF NOT EXISTS idx_info_requests_task ON information_requests(research_task_id);
CREATE INDEX IF NOT EXISTS idx_proofreading_tasks_research ON proofreading_tasks(research_task_id);
CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_request_departments_req ON request_departments(request_id);
CREATE INDEX IF NOT EXISTS idx_request_departments_dept ON request_departments(department_id);
