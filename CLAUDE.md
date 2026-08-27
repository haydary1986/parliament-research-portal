# منصة البحوث البرلمانية — مجلس النواب العراقي

> ملف استئناف الجلسة. أُنشئ في 2026-08-27 بإعادة بناء الحالة من git + الملفات غير المرفوعة + سجلات النشر.
> **لا توجد جلسة Claude Code سابقة لهذا المشروع** — العمل كان يجري عبر Gemini CLI، وسجلاته (`~/.gemini/tmp/perlaman/chats/`)
> تحتوي على bootstrap context فقط بدون محادثات. هذا الملف هو مصدر الحقيقة للاستئناف.

## أين المشروع

| | |
|---|---|
| المسار المحلي | `/Users/hayda/Documents/Projects/perlaman/House-of-Reps` |
| مساحة العمل الأوسع | `/Users/hayda/Documents/Projects/perlaman/` (تحوي `req.md` + `e2e-mobile/`) |
| الريبو الرئيسي | `newrepo` → https://github.com/haydary1986/parliament-research-portal (فرع `main`) |
| ريبو ثانٍ | `origin` → https://github.com/salammadah-max/House-of-Reps |
| الإنتاج | https://ppp.algonest.tech (Coolify، uuid `s14anw4d1zc53gvgc7oftptn`، اسم التطبيق `parliament-portal`) |
| DNS | `ppp.algonest.tech` → `91.109.114.87` (Cloudflare، proxied) |

## التقنيات

Go 1.25 (net/http بلا framework) + React 19 + Vite + Tailwind 4.1 + SQLite (`backend/noab.db`) + Docker.
واجهة عربية RTL كاملة، لوحة ألوان رسمية: Navy `#0A2540` / Gold `#B8860B` / Iraqi Red `#CE1126`.

البنية: `backend/` (handlers, middleware, models, db) و `deputy-portal/` (React) و `docs/` (5 ملفات توثيق).

## حالة الشيفرة عند التوقف

آخر commit: `abbaa99` — *fix(mobile): stat card grids* بتاريخ **2026-05-31**. مطابق لـ `newrepo/main` (لا يوجد commit غير مرفوع، ولا stash).

### العمل غير المكتمل (2026-07-20) — لم يُرفع ولم يُنشر

مهمة **الهوية الوطنية الرسمية** لصفحة تسجيل الدخول:

**ملفات جديدة غير متتبَّعة (untracked):**
- `deputy-portal/src/components/national/` — `StateEmblem.jsx`، `CouncilLogo.jsx`، `IraqFlag.jsx` (+ `FlagStripe`)، `IslamicPattern.jsx`، `BaghdadSkyline.jsx`
- `deputy-portal/public/national/` — `emblem-iraq.svg`، `flag-iraq.svg`، `council-logo.png`، `ATTRIBUTIONS.md`

**ملفات معدَّلة:** `deputy-portal/src/App.jsx` و `deputy-portal/src/index.css` (‏80+ / 17-).
`App.jsx` استبدل `components/layout/Brand` بمكوّنات `national/`: طبقات خلفية (نمط إسلامي + أفق بغداد + تدرّج تعتيم)، شريط علم أعلى الصفحة، ترويسة بشعار المجلس بين علمين، شعار الجمهورية، وعلامة مائية داخل بطاقة الدخول.

**تحقّق من الإنتاج:** الـ bundle المنشور (`assets/index-Bua8h_5W.js`) لا يحتوي على نص "جمهورية العراق" ⇒ الموقع الحيّ ما زال على `abbaa99`، والتصميم الوطني موجود محلياً فقط.

### الخطوة التالية المنطقية

1. `cd deputy-portal && npm install && npm run dev` ومعاينة صفحة الدخول للتأكد من اكتمال التصميم الوطني.
2. مراجعة `ATTRIBUTIONS.md` (تراخيص الشعارات) قبل الـ commit.
3. commit للعمل الوطني ثم push إلى `newrepo main` — Coolify مضبوط على auto-deploy عبر webhook.

## نتائج اختبار الموبايل (2026-05-31)

`../e2e-mobile/results.json` — 7 أدوار مُختبَرة بـ Playwright، مع لقطات في `../e2e-mobile/screenshots/`.
مشاكل معلّقة مسجّلة: عناصر تتجاوز عرض الشاشة (overflow) في بوابة النائب، و timeout في اختبار الجداول/النوافذ المنبثقة.

## المتطلبات الوظيفية

- 7 أدوار: نائب، مدير دائرة، رئيس قسم، باحث، مدقق لغوي، معاون، أدمن.
- 23 لجنة برلمانية رسمية (بعد تعديل النظام الداخلي) — القائمة في `../req.md`.
- 5 أقسام بحثية: البحوث، بحوث الموازنة، الدراسات القانونية، المكتبة النيابية، الدعم البحثي.
- workflow متعدد المراحل مع إحالة لأقسام متعددة، تعيين باحثين متعددين، وأرشفة رقمية بموافقة الباحث.
- مصادقة JWT مع blacklist للـ tokens وحظر تصاعدي، استيراد Excel جماعي، تصدير CSV للاعتمادات.

`../req.md` = ملاحظات العميل الأصلية (19/5/2026) وهو مرجع المتطلبات.

## التطوير المحلي

```bash
cd backend && go run main.go        # http://localhost:8080
cd deputy-portal && npm run dev     # http://localhost:5173
# أو: docker compose up -d          # frontend :3000 / backend :8080
```

حسابات تجريبية (كلمة المرور `123456`) موثّقة في `README.md`.

## التوثيق

`docs/ARCHITECTURE.md` · `docs/API.md` · `docs/WORKFLOW.md` · `docs/SECURITY.md` · `docs/DEPLOYMENT.md` (فيه قسم Coolify كامل).
