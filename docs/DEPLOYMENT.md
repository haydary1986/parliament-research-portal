# 🚢 دليل النشر - Deployment Guide

## نظرة عامة على الخيارات

| الخيار | متى نستخدمه |
|------|-----------|
| **Docker Compose المحلي** | تطوير محلي / staging |
| **Coolify** (الموصى به) | إنتاج self-hosted ✓ |
| **Kubernetes** | إنتاج موسَّع / multi-region |

---

## 🔒 عزل قاعدة البيانات (أهم نقطة)

النظام مُصمَّم بحيث **البيانات تنجو من أي rebuild/redeploy**.

### كيف يعمل العزل؟

```yaml
# docker-compose.yml
volumes:
  noab_db_data:        # ← named volume خارجي
    driver: local
    name: noab_db_data
```

```yaml
services:
  backend:
    volumes:
      - noab_db_data:/app/data     # ← قاعدة البيانات هنا
      - noab_uploads:/app/uploads   # ← الملفات المرفوعة هنا
    environment:
      DB_PATH: /app/data/noab.db    # ← يشير لداخل الـ volume
```

### ما الذي يحدث عند redeploy؟

1. ✅ Container القديم يُحذف
2. ✅ Image الجديد يُبنى
3. ✅ Container الجديد يُنشأ
4. ✅ **نفس الـ volume يُربط** بالمسار `/app/data`
5. ✅ التطبيق يجد `noab.db` كما تركه

### كيف تحذف البيانات (يدوياً عند الحاجة)؟

```bash
# ⚠️ تحذير: يحذف كل البيانات
docker volume rm noab_db_data noab_uploads
```

أو من Coolify UI: **Settings → Volumes → Delete**.

### النسخ الاحتياطي

```bash
# نسخ احتياطي لقاعدة البيانات
docker run --rm -v noab_db_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/noab-db-$(date +%Y%m%d).tar.gz -C /data .

# استعادة
docker run --rm -v noab_db_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/noab-db-YYYYMMDD.tar.gz -C /data
```

في Coolify: يمكن جدولة backups تلقائية من قائمة **Backups**.

---

## 🐳 1) Docker Compose المحلي

### المتطلبات

- Docker 24+
- Docker Compose 2.20+

### الخطوات

```bash
# 1. استنسخ
git clone https://github.com/haydary1986/parliament-research-portal.git
cd parliament-research-portal

# 2. أنشئ ملف الـ env
cp .env.example .env

# 3. ولّد JWT_SECRET قوياً
openssl rand -hex 32
# انسخ الناتج إلى .env

# 4. شغّل
docker compose up -d

# 5. تحقق
docker compose ps
docker compose logs -f backend

# الواجهة على: http://localhost:3000
# API على:    http://localhost:8080/api (داخلي فقط في الإنتاج)
```

### إيقاف وحذف الـ containers (البيانات تنجو)

```bash
docker compose down
```

### حذف كل شيء (بما فيه البيانات)

```bash
docker compose down -v
# ⚠️ هذا يحذف الـ volumes
```

---

## 🚀 2) Coolify (الموصى به)

[Coolify](https://coolify.io/) منصة self-hosted مفتوحة المصدر تعادل Heroku/Vercel.

### المتطلبات

- Coolify instance يعمل (مثل `docker.erticaz.com`)
- API key (للنشر التلقائي عبر API)
- دومين/subdomain يشير لـ Coolify (مثل `perl.algonest.tech`)

### الطريقة 1: عبر Coolify UI

#### الخطوة 1: إنشاء Resource

1. ادخل Coolify Dashboard
2. **+ New** → **Resource**
3. اختر **Public Repository**
4. URL: `https://github.com/haydary1986/parliament-research-portal`
5. Branch: `main`
6. Build Pack: **Docker Compose**

#### الخطوة 2: تعيين Environment Variables

في تبويب **Environment Variables**:

| Key | Value | ملاحظات |
|------|-------|--------|
| `JWT_SECRET` | (32 حرف عشوائي) | استخدم `openssl rand -hex 32` |
| `ALLOWED_ORIGIN` | `https://perl.algonest.tech` | الدومين الإنتاجي |
| `GO_ENV` | `production` | |
| `NO_SEED` | `false` (أو `true` بعد أول تشغيل) | |

#### الخطوة 3: تعيين الدومين

في **Domains**:
- Add `perl.algonest.tech`
- Coolify سيُولِّد SSL تلقائياً (Let's Encrypt)
- Port: 80 (frontend)

#### الخطوة 4: Persistent Storage

Coolify يكتشف الـ volumes تلقائياً من `docker-compose.yml`:
- `noab_db_data` → قاعدة البيانات (محمي ✓)
- `noab_uploads` → الملفات المرفوعة (محمي ✓)

#### الخطوة 5: Deploy

اضغط **Deploy** → Coolify يبدأ البناء والنشر.

### الطريقة 2: عبر Coolify API

```bash
# نشر تلقائي
curl -X POST 'https://docker.erticaz.com/api/v1/deploy' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "project_uuid": "...",
    "application": {
      "name": "parliament-research-portal",
      "git_repository": "https://github.com/haydary1986/parliament-research-portal",
      "git_branch": "main",
      "build_pack": "dockercompose",
      "fqdn": "https://perl.algonest.tech",
      "environment": [
        {"key": "JWT_SECRET", "value": "..."},
        {"key": "ALLOWED_ORIGIN", "value": "https://perl.algonest.tech"},
        {"key": "GO_ENV", "value": "production"}
      ]
    }
  }'
```

### تحديثات النشر

Coolify يدعم Auto-Deploy عبر webhook على git push:
1. اضغط على المشروع → **Webhooks**
2. انسخ الـ webhook URL
3. ضعه في GitHub repo → **Settings → Webhooks**

عند كل push على `main`: ينشر تلقائياً، **البيانات تنجو**.

---

## 📊 المراقبة بعد النشر

### Health Checks

كلا الـ containers يحويان health checks مدمجة:

```bash
docker ps
# تحقق أن العمود STATUS يظهر "(healthy)"
```

### Logs

```bash
# Backend logs
docker compose logs -f backend

# Frontend logs (nginx)
docker compose logs -f frontend
```

في Coolify: **Application → Logs** يعرضها في الـ UI.

### Metrics

Coolify يعرض:
- CPU & Memory usage
- Network I/O
- Disk usage للـ volumes

---

## 🔐 ضبط ما بعد النشر

### 1. غيّر كلمة مرور admin الافتراضية

دخول كـ `admin@parliament.iq` / `123456` → **تغيير كلمة المرور**

### 2. تعطيل seed بعد التشغيل الأول

في Coolify → Environment:
```
NO_SEED=true
```

ثم Redeploy. البيانات الموجودة محفوظة، فقط seed يتعطل.

### 3. إعداد النسخ الاحتياطي

في Coolify: **Backups** → **Schedule** → Daily.

أو يدوياً عبر cron:
```bash
0 2 * * * docker run --rm -v noab_db_data:/data -v /backups:/backup \
  alpine tar czf /backup/noab-$(date +\%Y\%m\%d).tar.gz -C /data .
```

---

## 🚨 استكشاف الأخطاء

### المشكلة: "JWT_SECRET is required"

**الحل**: عيّن `JWT_SECRET` في `.env` أو في Coolify env vars.

### المشكلة: Frontend يظهر CORS error

**الحل**: تأكد أن `ALLOWED_ORIGIN` يطابق الدومين تماماً (مع `https://`).

### المشكلة: البيانات تختفي بعد redeploy

**الحل**: تحقق أن volumes مُعرَّفة بـ `name:` صريح في docker-compose:
```yaml
volumes:
  noab_db_data:
    name: noab_db_data   # ← اسم صريح يمنع Docker من إعادة تسميتها
```

### المشكلة: 502 Bad Gateway من Nginx

**الحل**: تحقق أن backend يعمل:
```bash
docker compose logs backend
docker compose exec backend wget -O- http://localhost:8080/api/security/stats
```

### المشكلة: الـ build يأخذ وقتاً طويلاً

**الحل**: استخدم Docker BuildKit cache:
```bash
DOCKER_BUILDKIT=1 docker compose build
```

---

## 🔄 ترقية النظام

### تحديث الـ code

```bash
git pull origin main
docker compose build
docker compose up -d
# البيانات تنجو ✓
```

### Migration للـ schema

النظام يستخدم `CREATE TABLE IF NOT EXISTS` لذا التحديثات الإضافية للـ schema آمنة.

⚠️ **للتغييرات الكبيرة في الـ schema**:
1. نسخ احتياطي للـ DB أولاً
2. اختبر على staging
3. ثم انشر على production

---

## ☸️ 3) Kubernetes (اختياري)

للأنظمة الموسعة، يمكن تحويل docker-compose إلى Kubernetes manifests:

```bash
# باستخدام Kompose
kompose convert -f docker-compose.yml

# أو يدوياً مع PersistentVolumeClaim:
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: noab-db-pvc
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi
```

(manifests كاملة غير مرفقة - الـ docker-compose كافٍ للنطاق الحالي).

---

## 📋 Checklist للإنتاج

قبل اعتبار النشر مكتملاً:

- [ ] `JWT_SECRET` عشوائي وقوي
- [ ] `ALLOWED_ORIGIN` يطابق الدومين الفعلي
- [ ] TLS مُفعَّل (SSL grade A على [ssllabs.com](https://www.ssllabs.com/ssltest/))
- [ ] كلمة مرور admin مُغيَّرة
- [ ] Health checks تعمل (`docker ps` يظهر healthy)
- [ ] Backups مجدولة
- [ ] الـ volumes مُعرَّفة بأسماء صريحة (`name:` في compose)
- [ ] Logs مُراقَبة (CloudWatch / Loki / etc.)
- [ ] Rate limiting إضافي على reverse proxy (اختياري)
- [ ] Cloudflare أمام Coolify (للحماية من DDoS) (اختياري)
