<div align="center">

# 🏛️ منصة البحوث البرلمانية
### Iraqi Parliament Research Portal

**نظام إدارة الطلبات البحثية لمجلس النواب العراقي - دائرة البحوث والدراسات**

[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](LICENSE)
[![Go](https://img.shields.io/badge/Go-1.25-00ADD8?logo=go)](https://golang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.1-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)](https://sqlite.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://docker.com)

</div>

---

## 📖 نظرة عامة

منصة رقمية شاملة لإدارة دورة حياة البحوث البرلمانية في مجلس النواب العراقي،
من تقديم النائب للطلب حتى أرشفته في المستودع الرقمي. تدعم workflow متعدد
المراحل مع 7 أدوار مختلفة، مع تطبيق صارم لمبادئ الأمان وسلامة البيانات.

### ✨ المميزات الرئيسية

- 🔐 **مصادقة JWT** مع قائمة سوداء للـ tokens وحظر تصاعدي لمحاولات الدخول
- 👥 **7 أدوار**: نائب، مدير دائرة، رئيس قسم، باحث، مدقق لغوي، **معاون**، أدمن
- 📋 **23 لجنة برلمانية** رسمية بعد تعديل النظام الداخلي
- 🏢 **5 أقسام** بحثية: البحوث، بحوث الموازنة، الدراسات القانونية، المكتبة النيابية، الدعم البحثي
- 🔄 **Workflow كامل** مع دعم الإحالة لأقسام متعددة وتعيين باحثين متعددين
- 🗂️ **أرشفة رقمية** مع موافقة الباحث على النشر
- 📊 **لوحات معلومات** تفصيلية لكل دور
- 🌐 **RTL Arabic** كامل بتصميم رسمي (Navy + Gold)
- 📱 **إشعارات حية** + SMS hook للنوّاب

### 🏛️ لوحة الألوان الرسمية

| اللون | الكود | الاستخدام |
|------|------|---------|
| Navy Deep | `#0A2540` | الخلفيات الرئيسية والشريط الجانبي |
| Gold | `#B8860B` | الأزرار والعناوين البارزة |
| Iraqi Red | `#CE1126` | شريط العلم الزخرفي |

---

## 🚀 البدء السريع

### المتطلبات

- **Docker** و **Docker Compose** (الطريقة الموصى بها)
- أو: Go 1.25+ و Node.js 20+ للتطوير المحلي

### 🐳 التشغيل عبر Docker (موصى به)

```bash
# 1. استنسخ المستودع
git clone https://github.com/haydary1986/parliament-research-portal.git
cd parliament-research-portal

# 2. أنشئ ملف الـ environment
cp .env.example .env
# عدّل JWT_SECRET في .env بقيمة عشوائية قوية (32 حرف على الأقل)

# 3. ابدأ الخدمات
docker compose up -d

# 4. الواجهة متاحة الآن على:
#    Frontend: http://localhost:3000
#    Backend:  http://localhost:8080/api
```

### 💻 التطوير المحلي

#### Backend (Go):

```bash
cd backend
go mod download
go run main.go
# السيرفر يعمل على http://localhost:8080
```

#### Frontend (React + Vite):

```bash
cd deputy-portal
npm install
npm run dev
# الواجهة تعمل على http://localhost:5173
```

---

## 🔑 الحسابات التجريبية

كلمة المرور للجميع: `123456`

| الدور | البريد الإلكتروني | الاسم |
|------|------------------|------|
| نائب | khaled@parliament.iq | د. خالد العبيدي |
| نائب | sara@parliament.iq | أ. سارة عبدالرحمن |
| مدير الدائرة | manager@parliament.iq | مدير الدائرة |
| رئيس قسم البحوث | suad@parliament.iq | د. سعاد العلوي |
| رئيس بحوث الموازنة | hassan@parliament.iq | أ. حسن الربيعي |
| باحث | nour@parliament.iq | د. نور الدين |
| مدقق لغوي | mohammed.k@parliament.iq | أ. محمد الخطاط |
| **المعاون** | assistant@parliament.iq | د. عبدالكريم الأنصاري |
| مدير النظام | admin@parliament.iq | مدير النظام |

---

## 📚 التوثيق

| الملف | الوصف |
|------|------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | البنية المعمارية للنظام |
| [docs/API.md](docs/API.md) | مرجع كامل لـ REST API |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | تفاصيل سير عمل الطلبات |
| [docs/SECURITY.md](docs/SECURITY.md) | السياسات الأمنية والحماية |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | دليل النشر (Docker, Coolify, Kubernetes) |

---

## 🏗️ البنية المعمارية

```
┌─────────────────────────────────────────────┐
│         Browser (RTL Arabic)                │
└─────────────────┬───────────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────────┐
│      Nginx (Reverse Proxy + Static)         │
│  ┌──────────────┐    ┌──────────────────┐  │
│  │ React 19 +   │    │  /api/* proxied  │  │
│  │ Vite Build   │    │  to backend:8080 │  │
│  └──────────────┘    └────────┬─────────┘  │
└───────────────────────────────┼─────────────┘
                                │
┌───────────────────────────────▼─────────────┐
│   Go Backend (net/http, no framework)       │
│  ┌──────────────────────────────────────┐  │
│  │ Middleware: JWT, CORS, RateLimit,    │  │
│  │ BodyLimit, Logger                     │  │
│  ├──────────────────────────────────────┤  │
│  │ Handlers: Auth, Requests, Research,  │  │
│  │ Proofreading, Users, Files, Archive  │  │
│  └────────────────┬─────────────────────┘  │
└───────────────────┼─────────────────────────┘
                    │ database/sql + transactions
┌───────────────────▼─────────────────────────┐
│    SQLite (WAL mode + Foreign Keys)         │
│  Tables: users, departments, requests,      │
│  research_tasks, proofreading_tasks,        │
│  information_requests, notes, activity_logs,│
│  notifications, request_departments         │
└─────────────────────────────────────────────┘
```

تفاصيل أكثر في [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 🔄 سير العمل (Workflow)

```
النائب يقدم طلباً
        ↓
   pending — انتظار التوجيه
        ↓ (المدير يحيل لقسم/أقسام)
   assigned — محال
        ↓ (رئيس القسم يؤكد + يعين باحث/باحثين)
   in_progress — قيد الإعداد
        ↓ (الباحث يسلم البحث)
   pending_dept_review — مراجعة رئيس القسم
        ↓ (رئيس القسم يعتمد + يعين مدقق لغوي)
   proofreading — قيد المدقق اللغوي
        ↓ (المدقق ينتهي)
   in_progress (مرة أخرى) — الباحث يحيل للمعاون
        ↓
   pending_assistant — بانتظار المعاون
        ↓ (المعاون يعتمد)
   pending_dept_send — بانتظار إرسال رئيس القسم
        ↓ (رئيس القسم يرسل للنائب)
   delivered — مُسلَّم
        ↓ (الباحث يقرر الأرشفة)
   completed — مكتمل
```

تفاصيل كاملة في [docs/WORKFLOW.md](docs/WORKFLOW.md).

---

## 🚢 النشر على Coolify

دليل النشر التفصيلي في [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### الخطوات السريعة:

1. في Coolify Dashboard، أنشئ **New Resource** → **Public Repository**
2. أدخل: `https://github.com/haydary1986/parliament-research-portal`
3. اختر **Docker Compose** كنوع البناء
4. أضف Environment Variables:
   - `JWT_SECRET` (مفتاح عشوائي 32 حرف على الأقل)
   - `ALLOWED_ORIGIN` (دومين Frontend الإنتاجي)
5. اضغط **Deploy**

Coolify تتكفل بـ:
- ✅ بناء صور Docker
- ✅ شهادات SSL تلقائياً (Let's Encrypt)
- ✅ Reverse proxy عبر Traefik
- ✅ Persistent volumes للـ SQLite والملفات المرفوعة
- ✅ Health checks و auto-restart

---

## 🔐 الأمان

- **JWT** بمدة 8 ساعات + قائمة سوداء + التحقق من توقيع HS256
- **bcrypt** لكلمات المرور (default cost)
- **Rate Limiting تصاعدي** على endpoint تسجيل الدخول
- **CSP / HSTS / X-Frame-Options** + كل OWASP headers
- **Magic Bytes** للتحقق من نوع الملف (PDF/DOC/DOCX)
- **Sanitization** عبر bluemonday لكل المدخلات النصية
- **Transactions ذرية** لكل العمليات متعددة الجداول
- **Parameterized queries** فقط (لا SQL injection)

التفاصيل الكاملة في [docs/SECURITY.md](docs/SECURITY.md).

---

## 🛠️ التقنيات المستخدمة

### Backend
- **Go 1.25** — std library `net/http` بدون framework
- **SQLite** عبر [mattn/go-sqlite3](https://github.com/mattn/go-sqlite3) (WAL mode)
- **golang-jwt/jwt/v5** للمصادقة
- **bcrypt** لتجزئة كلمات المرور
- **bluemonday** لتعقيم HTML

### Frontend
- **React 19** + **Vite 7**
- **Tailwind CSS 4** (CSS-first config)
- **خط Cairo + Amiri** (Google Fonts)
- **fetch API** بدلاً من axios

### DevOps
- **Docker** متعدد المراحل (multi-stage builds)
- **Nginx** كـ reverse proxy للواجهة
- **Coolify** للنشر الذاتي

---

## 📂 هيكل المشروع

```
parliament-research-portal/
├── backend/                  # Go backend
│   ├── main.go              # نقطة الدخول وتعريف الـ routes
│   ├── db/                  # قاعدة البيانات (schema + seed)
│   ├── handlers/            # معالجات HTTP
│   ├── middleware/          # JWT, CORS, RateLimit, Logger
│   ├── models/              # تعريفات البيانات
│   └── Dockerfile
├── deputy-portal/           # React frontend
│   ├── src/
│   │   ├── App.jsx          # توجيه الـ portals + Login
│   │   ├── DeputyPortal.jsx
│   │   ├── ManagerPortal.jsx
│   │   ├── DepartmentPortal.jsx
│   │   ├── ResearcherPortal.jsx
│   │   ├── ProofreaderPortal.jsx
│   │   ├── AssistantManagerPortal.jsx  # المعاون
│   │   ├── SuperAdminPortal.jsx
│   │   ├── components/      # مكونات مشتركة (Modal, Card, ...)
│   │   ├── lib/             # committees.js, format.js
│   │   └── api.js           # API client
│   ├── Dockerfile
│   └── nginx.conf
├── docs/                    # توثيق المشروع
├── docker-compose.yml       # تجميع الخدمات
├── .env.example
├── LICENSE
└── README.md
```

---

## 📝 الترخيص

هذا المشروع مرخّص تحت [MIT License](LICENSE).

---

## 🤝 المساهمة

المساهمات مرحَّب بها. يرجى:
1. عمل Fork للمستودع
2. إنشاء branch للميزة (`git checkout -b feat/amazing-feature`)
3. Commit التغييرات (`git commit -m 'feat: add amazing feature'`)
4. Push للـ branch (`git push origin feat/amazing-feature`)
5. فتح Pull Request

---

<div align="center">

**صُنع بـ ❤️ لمجلس النواب العراقي**

[الموقع](https://github.com/haydary1986/parliament-research-portal) •
[التوثيق](docs/) •
[الإبلاغ عن مشكلة](https://github.com/haydary1986/parliament-research-portal/issues)

</div>
