# 📡 REST API Reference

Base URL: `https://your-domain.com/api`

كل الـ endpoints (عدا `/auth/login`) تتطلب header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 🔐 Authentication

### POST `/auth/login`
**عام (Public)** | Rate limited

```json
// Request
{
  "email": "user@parliament.iq",
  "password": "..."
}

// Response 200
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "data": {
    "token": "eyJhbGc...",
    "user": { "id": 3, "name": "...", "role": "deputy", ... }
  }
}
```

### POST `/auth/logout`
**Auth required**. يضيف الـ token للقائمة السوداء.

### PUT `/auth/change-password`
```json
{ "old_password": "...", "new_password": "..." }
```

---

## 📋 Requests (الطلبات)

### GET `/requests`
**Roles**: أي دور (مفلتر حسب الدور)

Query params: `?status=pending&department=research&page=1&limit=20`

### GET `/requests/{id}`
يُرجع الطلب + التأكيد + الملاحظات + الأقسام المُحالة + **ملفات البحث المرفوعة**
(`files[]`) + عدد المخاطبات الرسمية.

الوصول مقيّد بالدور: الجهة الطالبة ترى طلباتها، رئيس القسم طلبات أقسامه،
الباحث والمدقق ما لهم عليه مهمة، والأدوار الإشرافية كل الطلبات.

### POST `/requests`
**Roles**: `deputy` (كل الجهات الطالبة تحمل هذا الدور)

```json
{
  "title": "دراسة حول...",
  "description": "...",
  "purpose": "oversight|legislative|other",
  "committee": "اللجنة المالية",
  "can_share": true,
  "confidentiality": "public|confidential"
}
```

`requester_type` يُنسخ تلقائياً من حساب المستخدم على الطلب.

### PUT `/requests/{id}` ⭐ **جديد**
**Roles**: `manager`. تعديل بيانات الطلب. كل الحقول اختيارية.

```json
{
  "title": "...",
  "description": "...",
  "purpose": "oversight|legislative|other",
  "committee": "...",
  "deadline": "2026-06-01",
  "can_share": true,
  "confidentiality": "public|confidential"
}
```
مرفوض إن كان الطلب `delivered` / `completed` / `returned_exists` / `rejected`.

### PUT `/requests/{id}/assign`
**Roles**: `manager`. **يدعم إحالة لعدة أقسام + تعيين الباحث مباشرةً**.

```json
// قسم واحد (legacy)
{ "department_id": "research" }

// عدة أقسام
{ "department_ids": ["research", "budget_research"] }

// عدة أقسام + تعيين مباشر للباحثين (ينقل الطلب إلى in_progress)
{
  "department_ids": ["research"],
  "researcher_ids": [13, 15],
  "service_type": "دراسة",
  "classification": "مالية واقتصادية",
  "completion_days": 30
}
```

### PUT `/requests/{id}/confirm`
**Roles**: `department_head`. **يدعم تعيين عدة باحثين**.

```json
{
  "service_type": "دراسة",
  "classification": "مالية واقتصادية",
  "completion_days": 30,
  "researcher_ids": [13, 15]
}
```

### PUT `/requests/{id}/dept-review` ⭐ **جديد**
**Roles**: `department_head`. مراجعة رئيس القسم للبحث المسلَّم.

```json
{
  "decision": "approve|reject",
  "proofreader_id": 18,        // مطلوب عند approve
  "notes": "..."
}
```

### PUT `/requests/{id}/assistant-review`
**Roles**: `assistant_manager`. التدقيق النهائي من المعاون.

```json
{
  "decision": "approve|reject",
  "notes": "...",
  "confidentiality": "public|confidential"
}
```
`confidentiality` اختياري — يسمح للمعاون بتصحيح تصنيف الجهة الطالبة.
عند `approve` يحدد التصنيفُ المسارَ: `public` → `pending_dept_send`،
و `confidential` → `pending_manager_send`.

### PUT `/requests/{id}/dept-send`
**Roles**: `department_head`. إرسال البحث **العام** للجهة الطالبة.
يتطلب الحالة `pending_dept_send`، وأن يكون قسم المستخدم من الأقسام المُحالة.

### PUT `/requests/{id}/manager-send` ⭐ **جديد**
**Roles**: `manager`. إرسال البحث **ذي الخصوصية** للجهة الطالبة.
يتطلب الحالة `pending_manager_send`.

### PUT `/requests/{id}/return`
**Roles**: `manager`. إرجاع الطلب لعدم إمكانية التنفيذ.

### PUT `/requests/{id}/withdraw` ⭐ **جديد**
**Roles**: `deputy`. سحب الطلب من الجهة الطالبة، ما دام `pending`.

```json
{ "reason": "لم تعد هناك حاجة" }
```


---

## 🔬 Research Tasks (مهام البحث)

### GET `/research-tasks`
**Roles**: `researcher`, `department_head`, `manager`, `assistant_manager`, `admin`

### GET `/research-tasks/{id}`
يُرجع المهمة + طلبات المعلومات + الملاحظات.

### PUT `/research-tasks/{id}/status`
**Roles**: `researcher`, `department_head`

```json
{ "status": "in_progress|submitted|completed|returned" }
```

### POST `/research-tasks/{id}/info-requests`
**Roles**: `researcher` (مهامه فقط). الحد الأقصى **3 محاولات** لكل مهمة.
تفاصيل كتاب المخاطبة الرسمي:

```json
{
  "target_entity": "وزارة المالية",
  "subject": "طلب بيانات الموازنة",
  "number": "م/2026/512",
  "letter_date": "2026-03-11"
}
```
`number` و `letter_date` اختياريان — يُولَّد رقم تلقائي ويُستخدم تاريخ اليوم عند غيابهما.

### PUT `/research-tasks/{id}/file`
**Roles**: `researcher`. ربط ملف مرفوع بمهمة البحث.

```json
{ "file_path": "13_1787828194371980000.pdf" }
```

### PUT `/research-tasks/{id}/reassign` ⭐ **جديد**
**Roles**: `department_head`, `manager`. نقل المهمة لباحث بديل **بمحتواها كاملاً**.

```json
{ "researcher_id": 22, "notes": "مغادرة الباحث السابق" }
```
رئيس القسم مقيَّد بباحثي قسمه؛ مدير الدائرة غير مقيد. مرفوض إن كانت المهمة `completed`.


### PUT `/research-tasks/{id}/archive-consent`
**Roles**: `researcher`. موافقة الباحث على الأرشفة.

```json
{ "consent": "approved|rejected", "notes": "..." }
```

### PUT `/information-requests/{id}/response`
**Roles**: `researcher`. تحديث رد الجهة.

```json
{
  "status": "received|no_response",
  "response_letter_number": "..."   // مطلوب عند received
}
```

---

## ✍️ Proofreading (التدقيق اللغوي)

### GET `/proofreading-tasks`
**Roles**: `proofreader` (مهامه)، `department_head` (باحثو قسمه)، `manager`، `admin`.
كل مهمة تحمل `research_file` و`request_id` ليفتح المدقق المستند المطلوب تدقيقه.

### POST `/proofreading-tasks`
**Roles**: `department_head`

```json
{ "research_task_id": "RT-001", "proofreader_id": 18 }
```

### PUT `/proofreading-tasks/{id}/status`
**Roles**: `proofreader`

```json
{ "status": "in_progress|completed|returned", "notes": "..." }
```

---

## 👥 Users (المستخدمون)

### GET `/users`
**Roles**: `admin`, `manager`, `department_head`

Query: `?role=researcher&department=research`

### GET `/users/{id}`

### POST `/users`
**Roles**: `admin`, `department_head` (الأخير يقتصر على researcher/proofreader)

```json
{
  "name": "...",
  "email": "user@parliament.iq",
  "password": "min10chars+digits",
  "role": "researcher",
  "department_id": "research",
  "requester_type": "deputy",      // للجهات الطالبة
  "committees": ["اللجنة المالية"], // للجهات الطالبة (الأولى = الرئيسية)
  "phone": "07XXXXXXXXX"           // للجهات الطالبة (SMS)
}
```

`requester_type` ∈ `deputy` (نواب) · `presidency` (رئاسات) · `committee` (لجان) ·
`bloc_leader` (رؤساء الكتل) · `director` (مدراء) · `advisor` (مستشارين).

### POST `/users/bulk`
**Roles**: `admin`. إنشاء حتى 500 حساب دفعة واحدة بكلمات مرور مولَّدة.

```json
{
  "users": [
    {
      "name": "د. علي محمد",
      "email": "ali.m@parliament.iq",
      "phone": "07701112233",
      "deputy_id": "DEP-100",
      "role": "deputy",
      "requester_type": "committee",
      "committees": ["اللجنة المالية", "لجنة النزاهة"]
    }
  ]
}
```
الاستجابة تُرجع كلمة المرور المولَّدة لكل حساب — تُعرَض مرة واحدة فقط.

### PUT `/users/{id}` ⭐ **جديد**
**Roles**: `admin`. تعديل الاسم والبريد والقسم واللجان والهاتف والتخصص.
الدور غير قابل للتغيير، والحذف غير مدعوم — التعطيل عبر `/status` هو البديل.

### PUT `/users/{id}/status`
**Roles**: `admin`, `department_head`

```json
{ "status": "active|inactive|suspended" }
```

### PUT `/users/{id}/reset-password`
**Roles**: `admin`. إعادة تعيين كلمة مرور أي مستخدم بلا الحاجة للقديمة.

```json
{ "new_password": "min6chars" }
```

---

## 🏢 Departments (الأقسام)

### GET `/departments`
يُرجع الأقسام الخمسة الرسمية.

### GET `/departments/{id}`
يُرجع تفاصيل القسم + قائمة الباحثين.

### POST `/departments` ⭐ **جديد**
**Roles**: `admin`

```json
{ "id": "legal_studies", "name": "قسم الدراسات القانونية", "head_name": "...", "color": "#0A2540" }
```
`id` مفتاح ثابت: حروف لاتينية صغيرة وأرقام وشرطة سفلية فقط.

### PUT `/departments/{id}` ⭐ **جديد**
**Roles**: `admin`. تعديل الاسم أو رئيس القسم أو اللون.

### DELETE `/departments/{id}` ⭐ **جديد**
**Roles**: `admin`. يُرفض إن كان للقسم مستخدمون أو طلبات.

---

## 📊 Dashboard & Notifications

### GET `/dashboard/stats`
**Roles**: `admin`, `manager`

```json
{
  "total_requests": 150,
  "pending_requests": 12,
  "in_progress_count": 45,
  "completed_requests": 89,
  "total_researchers": 15,
  "total_departments": 5
}
```

### GET `/notifications`
**Roles**: أي دور. يُرجع آخر 50 إشعار.

### GET `/notifications?page=1&limit=20&unread=true`
يدعم الترقيم وفلتر غير المقروء. الاستجابة تحمل `total` و`unread`.

### PUT `/notifications/{id}/read`
وضع علامة "مقروء".

### PUT `/notifications/read-all` ⭐ **جديد**
تعليم كل إشعارات المستخدم كمقروءة.

### GET `/activity-logs`
**Roles**: `admin`, `manager`. مع pagination.

---

## 📝 Notes (الملاحظات)

### POST `/notes`
**Roles**: أي دور (مع التحقق من ملكية الكيان)

```json
{
  "entity_type": "request|research_task|proofreading_task",
  "entity_id": "REQ-001",
  "content": "..."
}
```

---

## 📁 Files (الملفات)

### POST `/upload`
**Multipart**. أنواع مسموحة: PDF, DOC, DOCX. الحد: 10 MB.

```http
POST /api/upload
Content-Type: multipart/form-data

file: <binary>
```

### GET `/files/{filename}`
تنزيل ملف.

---

## 🔎 Archive Search (الأرشيف)

### GET `/archive/search`
**Roles**: `manager`, `admin`

بارامترات: `q` · `department` · `committee` · `from` · `to` · `page` · `limit`.
يبحث في العنوان والوصف واسم الجهة الطالبة، للبحوث `delivered` و`completed`.
يجب تحديد معيار واحد على الأقل. الاستجابة مُرقَّمة.

---

## 🛡️ Security

### GET `/security/stats`
**Roles**: `admin`. عدد IPs المحظورة والمشبوهة والحسابات المقفلة.

---

## 📈 Reports (التقارير)

### GET `/reports/operations` ⭐ **جديد**
**Roles**: `manager`, `admin`. تقرير الأداء: توزيع الحالات واللجان والجهات،
حِمل الأقسام والباحثين، الطلبات المتأخرة، ومتوسط مدة الإنجاز.

### GET `/reports/requests-export` ⭐ **جديد**
**Roles**: `manager`, `admin`. صفوف مسطّحة لكل الطلبات جاهزة للتحويل إلى Excel.

---

## ❤️ Health

### GET `/healthz`
**عام (Public)**. فحص جاهزية الخدمة للـ Docker/Coolify.

```json
{ "status": "ok" }
```

---

## 📋 Status Codes

| Code | المعنى |
|------|------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (بيانات خاطئة) |
| 401 | Unauthorized (token مفقود أو منتهي) |
| 403 | Forbidden (صلاحيات غير كافية) |
| 404 | Not Found |
| 429 | Too Many Requests (محظور مؤقتاً) |
| 500 | Internal Server Error |

## 📦 Response Envelope

كل الـ responses تتبع الشكل:

```json
{
  "success": true | false,
  "message": "رسالة وصفية بالعربية",
  "data": { ... }       // عند النجاح
}
```

للقوائم paginated:
```json
{
  "success": true,
  "data": [ ... ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```
