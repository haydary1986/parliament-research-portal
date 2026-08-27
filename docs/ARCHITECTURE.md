# 🏗️ البنية المعمارية - Architecture

## نظرة عامة

النظام يتبع معمارية **3-Tier classic**:

```
┌──────────────────────────────────────────┐
│  Presentation Layer (React SPA)           │
│  - 7 portals منفصلة لكل دور                │
│  - مكونات مشتركة + design system           │
│  - state management عبر useState/useEffect│
└────────────────┬─────────────────────────┘
                 │ REST/JSON
┌────────────────▼─────────────────────────┐
│  Application Layer (Go HTTP server)       │
│  - net/http بدون framework                │
│  - JWT middleware + rate limiting         │
│  - handlers لكل domain                    │
└────────────────┬─────────────────────────┘
                 │ database/sql + tx
┌────────────────▼─────────────────────────┐
│  Data Layer (SQLite + WAL)                │
│  - 11 جدول مع foreign keys                │
│  - junction tables للعلاقات M:N          │
└──────────────────────────────────────────┘
```

---

## Backend (Go)

### مبادئ التصميم

- **بدون framework**: استخدام `net/http` standard library فقط
- **Accept interfaces, return structs**: pattern Go قياسي
- **Transactions ذرية**: `withTx()` helper لكل العمليات متعددة الجداول
- **Error wrapping**: `fmt.Errorf("...: %w", err)` للتتبع
- **Single source of truth**: `db.DB` singleton مُهيّأ في `main()`

### هيكل الملفات

```
backend/
├── main.go                # نقطة الدخول + تعريف الـ routes
├── go.mod / go.sum
├── db/
│   ├── db.go             # تهيئة SQLite + Embedded schema/seed
│   ├── migrate.go        # ترحيل المخطط للقواعد القائمة ⭐
│   ├── schema.sql        # CREATE TABLE statements (embedded)
│   └── seed.sql          # بيانات تجريبية (embedded)
├── middleware/
│   └── middleware.go     # JWT, CORS, RateLimit, BodyLimit, Logger
├── models/
│   └── models.go         # كل الـ structs (User, Request, ...)
└── handlers/
    ├── auth.go           # Login, Logout, ChangePassword
    ├── requests.go       # CRUD الطلبات + Assign + Confirm + Review
    ├── research.go       # مهام البحث + المعاون + الأرشفة
    ├── proofreading.go   # التدقيق اللغوي + مراجعة رئيس القسم
    ├── users.go          # إدارة المستخدمين
    ├── departments.go    # الأقسام
    ├── files.go          # رفع وعرض الملفات
    ├── dashboard.go      # الإحصائيات + الإشعارات + سجل النشاط
    ├── archive.go        # البحث في الأرشيف
    ├── admin.go          # تعديل المستخدمين + إدارة الأقسام ⭐
    ├── reports.go        # التقارير التشغيلية والتصدير ⭐
    ├── security.go       # القائمة السوداء الدائمة + قفل الحساب ⭐
    ├── sms.go            # إشعارات SMS (إرسال خلفي + إعادة محاولة) ⭐
    ├── handlers_test.go  # اختبارات الوحدة ⭐
    └── helpers.go        # withTx, logErr, sanitize, canAccessRequest
```

### Routing

التطبيق يستخدم **Go 1.22+ pattern matching** المدمج في `net/http.ServeMux`:

```go
mux.Handle("PUT /api/requests/{id}/assign", role("manager")(http.HandlerFunc(handlers.AssignRequest)))
```

كل route يُغلَّف بـ:
1. `Auth` — التحقق من JWT
2. `RoleAuth(roles...)` — التحقق من الدور
3. `Handler` نفسه

### Middleware Stack

من الخارج للداخل:

```
HTTP Request
    ↓
Logger          ← يسجل المدة + الـ IP
    ↓
CORS            ← يفحص Origin + يضيف Security Headers
    ↓
BodyLimit       ← يرفض الطلبات > 1MB
    ↓
Auth            ← يفحص JWT (إن لزم)
    ↓
RoleAuth        ← يفحص الدور (إن لزم)
    ↓
Handler         ← المنطق الفعلي
```

---

## Frontend (React)

### مبادئ التصميم

- **مكونات صغيرة قابلة للتجميع**: Modal, Card, Button, Badge
- **Tailwind 4 CSS-first**: متغيرات CSS داخل `@theme` directive
- **State management بسيط**: useState/useEffect (لا Redux أو Zustand)
- **RTL أولاً**: التطبيق كله بالعربية واتجاه RTL

### هيكل الملفات

```
deputy-portal/src/
├── App.jsx                       # Router + Login page
├── main.jsx                      # React root
├── index.css                     # Design system (Tailwind + custom)
├── api.js                        # API client (fetch wrapper)
│
├── DeputyPortal.jsx              # بوابة النائب
├── ManagerPortal.jsx             # بوابة مدير الدائرة
├── DepartmentPortal.jsx          # بوابة رئيس القسم
├── ResearcherPortal.jsx          # بوابة الباحث
├── ProofreaderPortal.jsx         # بوابة المدقق اللغوي
├── AssistantManagerPortal.jsx    # بوابة المعاون (جديد)
├── SuperAdminPortal.jsx          # لوحة إدارة النظام
│
├── components/
│   ├── icons/
│   │   └── Icons.jsx             # 23 أيقونة SVG
│   ├── layout/
│   │   ├── Brand.jsx             # شعار النظام (SVG)
│   │   ├── Sidebar.jsx           # القائمة الجانبية
│   │   ├── Topbar.jsx            # الشريط العلوي + الإشعارات
│   │   └── PortalLayout.jsx      # تجميع الكل + تغيير كلمة المرور
│   └── ui/
│       ├── Modal.jsx
│       ├── StatusBadge.jsx       # شارة الحالة بالعربية
│       ├── StatCard.jsx          # بطاقة KPI
│       ├── EmptyState.jsx
│       ├── Spinner.jsx
│       └── Toast.jsx             # نظام إشعارات in-app
│
└── lib/
    ├── committees.js             # 23 لجنة برلمانية
    └── format.js                 # ROLE_LABELS, REQUEST_STAGES, ...
```

### Design Tokens (CSS Variables)

كل الألوان والقياسات في `index.css` ضمن `@theme`:

```css
@theme {
  --color-navy-900: #0A2540;   /* اللون الأساسي */
  --color-gold-600: #B8860B;   /* اللون الثانوي */
  --color-success-600: #059669;
  --color-danger-600: #DC2626;
  /* ... */
  --font-sans: 'Cairo', ...;
}
```

### مكونات utility-first

كل المكونات مبنية بـ CSS classes موحَّدة:
- `.card`, `.card-hover`, `.card-header`
- `.btn-primary`, `.btn-gold`, `.btn-outline`, `.btn-ghost`
- `.input`, `.select`, `.textarea`, `.label`
- `.badge-navy`, `.badge-gold`, `.badge-success`, ...
- `.status-pending`, `.status-in_progress`, ... (state machine)

---

## Data Layer (SQLite)

### نموذج البيانات

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│ departments  │◄────│    users     │────►│  requests        │
│ (5 أقسام)    │     │ (7 أدوار)    │     │                  │
└──────────────┘     └──────┬───────┘     └────────┬─────────┘
        ▲                   │                     │
        │                   │                     │
        │            ┌──────▼────────┐    ┌──────▼──────────┐
        │            │ permissions   │    │ research_tasks   │
        │            │ user_perms    │    │  (N per request) │
        │            └───────────────┘    └────────┬────────┘
        │                                          │
        └─── request_departments ◄─────────┐       │
             (junction M:N)                 │       │
                                            │       ▼
                                            │  ┌──────────────────────┐
                                            │  │ information_requests │
                                            │  │ proofreading_tasks   │
                                            │  └──────────────────────┘
                                            │
                                    ┌───────▼──────────┐
                                    │     notes        │
                                    │ activity_logs    │
                                    │ notifications    │
                                    └──────────────────┘
```

### جداول حالة الأمان

| الجدول | الغرض |
|------|------|
| `revoked_tokens` | القائمة السوداء الدائمة — تنجو من النشر |
| `login_attempts` | عدّاد المحاولات وقفل الحساب |

### الجداول الرئيسية

| الجدول | الوصف |
|------|------|
| `users` | المستخدمون + الأدوار |
| `departments` | الأقسام البحثية (5) |
| `requests` | الطلبات البحثية (الكيان الرئيسي) |
| `request_departments` | M:N للإحالة لعدة أقسام |
| `research_tasks` | مهام البحث (N per request) |
| `proofreading_tasks` | مهام التدقيق اللغوي |
| `information_requests` | كتب طلب المعلومات للجهات (3 محاولات) |
| `request_confirmations` | تفاصيل تأكيد الطلب |
| `notes` | الملاحظات (polymorphic) |
| `activity_logs` | سجل النشاط |
| `notifications` | الإشعارات في الـ inbox |
| `permissions` + `user_permissions` | RBAC |

### الفهارس

كل العلاقات الأجنبية + الحقول المُستخدمة في الفلترة لها فهارس صريحة:

```sql
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_deputy ON requests(deputy_id);
CREATE INDEX idx_requests_department ON requests(assigned_department);
CREATE INDEX idx_research_tasks_request ON research_tasks(request_id);
-- ...إلخ
```

### الترحيل (Migrations) ⚠️ مهم

`schema.sql` يستخدم `CREATE TABLE IF NOT EXISTS`، ما يعني أن **أي عمود جديد لا
يُنشأ على قاعدة بيانات موجودة** (مثل قاعدة الإنتاج داخل الـ volume). لذلك يوجد
`db/migrate.go` يُستدعى بين `Init()` و `Seed()` في `main()`:

```go
db.Init(dbPath)   // ينشئ الجداول الناقصة فقط
db.Migrate()      // يضيف الأعمدة/القيود الناقصة للجداول القائمة
db.Seed()         // بيانات تجريبية عند أول تشغيل
```

آليتان:

| الحالة | الأداة |
|------|------|
| عمود جديد | `addColumnIfMissing()` → `ALTER TABLE ... ADD COLUMN` |
| تغيير قيد `CHECK` | إعادة بناء الجدول (SQLite لا يدعم تعديل CHECK) |

إعادة البناء تتبع إجراء SQLite الرسمي: `PRAGMA foreign_keys=OFF` →
جدول جديد → نسخ الأعمدة المشتركة → `DROP` القديم → `RENAME` → إعادة الفهارس →
`PRAGMA foreign_key_check`. تعريف الجدول يُستخرج من `schema.sql` نفسه
(`extractCreateTable`) فيبقى في مصدر واحد.

كل الترحيلات **idempotent** — تُكتشف الحاجة إليها من `sqlite_master` وتُتخطى إن كان
المخطط محدَّثاً.

> **عند إضافة عمود جديد**: حدّث `schema.sql` (للقواعد الجديدة) **و** أضف الترحيل
> المقابل في `migrate.go` (للقواعد القائمة). إغفال الثاني يعمل محلياً ويفشل في الإنتاج.

### Transactions

كل العمليات متعددة الكتابات داخل `withTx()`:

```go
txErr := withTx(func(tx *sql.Tx) error {
    if _, err := tx.Exec("INSERT INTO ...", args...); err != nil {
        return fmt.Errorf("INSERT: %w", err)
    }
    if _, err := tx.Exec("UPDATE ...", args...); err != nil {
        return fmt.Errorf("UPDATE: %w", err)
    }
    return logActivityTx(tx, ...)
})
```

عند فشل أي خطوة → rollback تلقائي.

---

## Authentication & Authorization

### JWT Flow

```
1. POST /api/auth/login (email, password)
2. Backend يفحص bcrypt + يولّد JWT (8h TTL)
3. Response: { token, user }
4. Client يحفظ token في memory (state)
5. كل طلب يحوي: Authorization: Bearer <token>
6. Backend Middleware يفك التشفير + يحقن user info في context
```

### Role-based Access Control

كل route يحدد الأدوار المسموحة:

```go
mux.Handle("PUT /api/requests/{id}/assistant-review",
    role("assistant_manager")(http.HandlerFunc(handlers.AssistantFinalReview)))
```

7 أدوار:
- `deputy` — النائب
- `manager` — مدير الدائرة
- `department_head` — رئيس القسم
- `researcher` — الباحث
- `proofreader` — المدقق اللغوي
- `assistant_manager` — **المعاون** (جديد)
- `admin` — مدير النظام

---

## Workflow State Machine

تفاصيل كاملة في [WORKFLOW.md](WORKFLOW.md).

```
pending → assigned → in_progress → pending_dept_review
    ↓         (أو مباشرة in_progress             ↓
returned_exists  إن عيّن المدير الباحث)     proofreading
                                                 ↓
                                          pending_assistant
                                                 ↓
                        ┌────────────────────────┴────────────────────────┐
                  بحث عام ↓                                  بحث ذو خصوصية ↓
                  pending_dept_send                        pending_manager_send
                  (رئيس القسم)                              (مدير الدائرة)
                        └────────────────────────┬────────────────────────┘
                                                 ↓
                                        delivered → completed
```

المسار يتفرّع عند المعاون حسب `requests.confidentiality`.

---

## Deployment

تفاصيل في [DEPLOYMENT.md](DEPLOYMENT.md).

النظام مُجهّز للنشر عبر:
- **Docker Compose** (الموصى به)
- **Coolify** (self-hosted PaaS)
- **Kubernetes** (manifests غير مرفقة، سهل التحويل)

---

## القرارات المعمارية (ADRs)

### لماذا SQLite وليس Postgres؟

- **بساطة النشر**: ملف واحد، بدون خادم منفصل
- **حجم البيانات**: مجلس النواب ≈ 329 نائب + موظفون قلائل → SQLite كافٍ تماماً
- **WAL mode**: يدعم قراءة متزامنة + كتابة واحدة
- **سهولة النسخ الاحتياطي**: ملف واحد + WAL

### لماذا Go بدون framework؟

- **net/http في Go 1.22+** يدعم pattern matching مدمج
- **أقل dependencies**: أمان وسرعة بناء أعلى
- **منحنى تعلم أقل** للمساهمين الجدد

### لماذا React بدون state library؟

- **بساطة الـ state**: كل portal محتواه مستقل
- **React 19** تحسينات أداء كافية
- **خفّة الـ bundle**: لا حاجة لـ Redux/Zustand للنطاق الحالي

---

## النمو المستقبلي

عند نموّ النظام، نقاط التطوير الموصى بها:

1. **PostgreSQL migration** عند تجاوز 100K طلب
2. **Redis** للـ rate limiting (القائمة السوداء صارت في قاعدة البيانات)
3. **Worker queue** للإشعارات SMS + Email (مثل Asynq)
4. **Object storage** (S3/MinIO) للملفات المرفوعة
5. **Microservices split** عند الحاجة (auth, notifications, files)
