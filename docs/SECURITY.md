# 🔐 السياسات الأمنية - Security Policies

## نظرة عامة

النظام يطبق دفاعاً متعدد الطبقات (defense in depth) ضد ثغرات OWASP Top 10.

---

## 🔑 المصادقة والتفويض

### JWT (JSON Web Tokens)

- **الخوارزمية**: HS256
- **مدة الصلاحية**: 8 ساعات (مقصورة)
- **المفتاح**: من `JWT_SECRET` env var، **مطلوب 32 حرف على الأقل**
- **في الإنتاج**: السيرفر يرفض البدء بدون `JWT_SECRET`

```go
// middleware/middleware.go
if os.Getenv("GO_ENV") == "production" {
    log.Fatal("❌ JWT_SECRET مطلوب في بيئة الإنتاج")
}
```

### Token Blacklist

- عند `POST /auth/logout`، الـ token يُضاف للقائمة السوداء (in-memory)
- goroutine منفصل يُنظّف الـ tokens المنتهية كل ساعة
- يمكن إيقاف الـ goroutine عبر `StopBlacklistCleanup()` (للاختبار والإيقاف الآمن)
- **للإنتاج الموسّع**: يُنصح بترحيل القائمة السوداء إلى Redis

### Rate Limiting تصاعدي

```
3 محاولات فاشلة → حظر 30 ثانية
5 محاولات فاشلة → حظر 2 دقيقة
7 محاولات فاشلة → حظر 10 دقائق
10 محاولات فاشلة → حظر 30 دقيقة + تنبيه أمني
```

كل عداد يُربط بـ IP العميل (مستخرج عبر `net.SplitHostPort` لاستبعاد المنفذ).

### bcrypt للكلمات السرية

```go
// تجزئة
hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
// = cost factor 10 → ~100ms على CPU حديث
```

- **الحد الأدنى لطول كلمة المرور**: 6 أحرف
- لا يتم تخزين كلمة المرور بأي صيغة خام
- في الاستجابات: حقل `PasswordHash` مُعلَّم `json:"-"` لمنع التسرب

---

## 🛡️ HTTP Security Headers

كل response يحوي:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()

# عند TLS فقط:
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 🌐 CORS

Allowlist محدودة:
```go
allowedOrigins := map[string]bool{
    "http://localhost:5173": true,  // Vite dev
    "http://localhost:3000": true,
    // ...
}
if prodOrigin := os.Getenv("ALLOWED_ORIGIN"); prodOrigin != "" {
    allowedOrigins[prodOrigin] = true
}
```

في الإنتاج: عيّن `ALLOWED_ORIGIN=https://your-domain.com` فقط.

---

## 📥 Input Validation & Sanitization

### Body Limit

كل الـ requests محدودة بـ **1 MB**:

```go
r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
```

### HTML Sanitization

كل المدخلات النصية تمر عبر `bluemonday.StrictPolicy()` التي تحذف كل HTML tags.
ثم `html.UnescapeString` لتجنب الترميز المزدوج عند العرض:

```go
func sanitize(s string) string {
    return html.UnescapeString(sanitizer.Sanitize(s))
}
```

### SQL Injection

كل الاستعلامات تستخدم **parameterized queries** فقط:

```go
// ✅ آمن
db.DB.Query("SELECT ... WHERE id = ?", userInput)

// ❌ غير موجود في الكود
db.DB.Query("SELECT ... WHERE id = '" + userInput + "'")
```

### File Upload Validation

#### 1. Extension whitelist:
```go
allowed := map[string]bool{".doc": true, ".docx": true, ".pdf": true}
```

#### 2. Magic Bytes verification:
```go
var (
    pdfMagic   = []byte("%PDF-")
    zipMagic   = []byte("PK\x03\x04")
    docMagic   = []byte{0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1}
    docxKeyword = []byte("word/")  // مطلوب داخل ZIP
)
```

ZIP العام مرفوض — DOCX يجب أن يحتوي `word/` داخل الـ ZIP archive.

#### 3. حدود الحجم:
- **10 MB** سقف للملف الواحد
- `http.MaxBytesReader` يقطع الاتصال إذا تجاوز

#### 4. منع Path Traversal:
- اسم الملف الأصلي مُهمَل
- يُولَّد اسم جديد: `{userID}_{timestamp}.{ext}`
- عند التنزيل: `strings.Contains(filename, "..")` و `strings.Contains(filename, "/")` مرفوضة

---

## 🔒 Database Security

### Foreign Keys + Transactions

```sql
PRAGMA foreign_keys = ON;
```

كل العمليات متعددة الجداول داخل `withTx()`:

```go
txErr := withTx(func(tx *sql.Tx) error {
    // كل الـ writes هنا
    // فشل واحد → rollback تلقائي
})
```

### WAL Mode

```sql
PRAGMA journal_mode = WAL;
```

يدعم:
- قراءات متزامنة + كتابة واحدة
- atomic commits
- recovery automatique بعد الـ crashes

### Constraints

```sql
status TEXT CHECK (status IN ('pending', 'assigned', ...))
role TEXT CHECK (role IN ('deputy', 'manager', ...))
```

Database-level enforcement لقيم الـ enums.

---

## 🔍 Audit Trail

كل العمليات المهمة تُسجَّل في `activity_logs`:

```go
logActivityTx(tx, userID, userName, "confirm_request",
    strPtr("request"), &id, "تأكيد الطلب وتعيين باحث")
```

الحقول المسجَّلة: المستخدم، الإجراء، نوع الكيان، معرف الكيان، التفاصيل، الوقت.

`GET /api/activity-logs` متاح للأدمن والمدير فقط.

---

## 🚨 Security Monitoring

### إحصائيات الأمان

`GET /api/security/stats` يُرجع:
- عدد IPs المحظورة حالياً
- عدد IPs المشبوهة

متاح للأدمن فقط.

### Logging

- كل محاولة دخول فاشلة → log
- 7 محاولات فاشلة → تنبيه `⚠️`
- 10 محاولات فاشلة → تنبيه `🚨` مع IP

---

## 🛠️ Build & Runtime Security

### Static Analysis

```bash
# في CI:
go vet ./...
gosec ./...     # موصى به للإنتاج
```

### Container Hardening

في `Dockerfile`:
- Base image: `alpine:latest` (الحجم الأصغر = surface attack أقل)
- المستخدم non-root
- `ca-certificates` فقط

---

## ⚠️ ما هو *ليس* مغطى

النظام **لا يحوي** حالياً:

- ❌ تكامل SMS gateway حقيقي (placeholder فقط)
- ❌ E-Mail notifications
- ❌ 2FA / MFA
- ❌ SSO (SAML / OAuth)
- ❌ DDoS protection على مستوى الشبكة (يُنصح بـ Cloudflare)
- ❌ WAF (Web Application Firewall)

هذه نقاط توسعة مستقبلية حسب الحاجة.

---

## 🚨 الإبلاغ عن الثغرات

إذا اكتشفت ثغرة أمنية، يرجى **عدم** فتح issue عام.

أرسل بريداً إلى security@parliament.iq (placeholder) مع:
- وصف الثغرة
- خطوات إعادة الإنتاج
- التأثير المحتمل

سنرد خلال 48 ساعة.

---

## 📋 Pre-deployment Checklist

قبل النشر للإنتاج:

- [ ] `JWT_SECRET` مُعيَّن (32 حرف عشوائي)
- [ ] `ALLOWED_ORIGIN` يطابق الدومين الحقيقي
- [ ] `GO_ENV=production`
- [ ] TLS مُفعَّل (Let's Encrypt عبر Coolify/Traefik)
- [ ] الـ uploads volume خارج container (للنسخ الاحتياطي)
- [ ] الـ database volume خارج container (للنسخ الاحتياطي)
- [ ] كلمة مرور admin الافتراضية مُغيَّرة
- [ ] Activity logs مُراقَبة بانتظام
- [ ] نسخ احتياطية تلقائية للـ DB
- [ ] Rate limiting إضافي على مستوى reverse proxy
