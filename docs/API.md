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
يُرجع الطلب + التأكيد + الملاحظات + قائمة الأقسام المُحالة.

### POST `/requests`
**Roles**: `deputy`

```json
{
  "title": "دراسة حول...",
  "description": "...",
  "purpose": "oversight|legislative|other",
  "committee": "اللجنة المالية",
  "can_share": true
}
```

### PUT `/requests/{id}/assign`
**Roles**: `manager`. **يدعم إحالة لعدة أقسام**.

```json
// قسم واحد (legacy)
{ "department_id": "research" }

// عدة أقسام (الجديد)
{ "department_ids": ["research", "budget_research"] }
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

### PUT `/requests/{id}/assistant-review` ⭐ **جديد**
**Roles**: `assistant_manager`. التدقيق النهائي من المعاون.

```json
{ "decision": "approve|reject", "notes": "..." }
```

### PUT `/requests/{id}/dept-send` ⭐ **جديد**
**Roles**: `department_head`. إرسال البحث المعتمد للنائب.

### PUT `/requests/{id}/return`
**Roles**: `manager`. إرجاع الطلب لعدم إمكانية التنفيذ.

### PUT `/requests/{id}/final-review` (قديم - متوافق)
**Roles**: `manager`. متوفر للتوافق مع الإصدارات السابقة.

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
**Roles**: `researcher`. الحد الأقصى **3 محاولات** لكل مهمة.

```json
{
  "target_entity": "وزارة المالية",
  "subject": "..."
}
```

### PUT `/research-tasks/{id}/refer-assistant` ⭐ **جديد**
**Roles**: `researcher`. الباحث يحيل البحث للمعاون.

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
**Roles**: `proofreader`, `department_head`, `manager`, `admin`

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
  "password": "min6chars",
  "role": "researcher",
  "department_id": "research",
  "committee": "اللجنة المالية",   // للنواب فقط
  "phone": "07XXXXXXXXX"           // للنواب فقط (SMS)
}
```

### PUT `/users/{id}/status`
**Roles**: `admin`, `department_head`

```json
{ "status": "active|inactive|suspended" }
```

---

## 🏢 Departments (الأقسام)

### GET `/departments`
يُرجع الأقسام الخمسة الرسمية.

### GET `/departments/{id}`
يُرجع تفاصيل القسم + قائمة الباحثين.

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

### PUT `/notifications/{id}/read`
وضع علامة "مقروء".

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

### GET `/archive/search?q=keyword`
**Roles**: `manager`, `admin`

البحث في عناوين ووصف البحوث المكتملة المؤرشفة.

---

## 🛡️ Security

### GET `/security/stats`
**Roles**: `admin`. عدد IPs المحظورة والمشبوهة.

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
