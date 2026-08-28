package handlers

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"noab-backend/db"
)

// TestMain يهيّئ قاعدة بيانات مؤقتة لكل تشغيل — لا تمسّ قاعدة التطوير
func TestMain(m *testing.M) {
	tmp := filepath.Join(os.TempDir(), "noab-test.db")
	_ = os.Remove(tmp)
	if err := db.Init(tmp); err != nil {
		panic(err)
	}
	if err := db.Migrate(); err != nil {
		panic(err)
	}
	code := m.Run()
	_ = db.DB.Close()
	_ = os.Remove(tmp)
	os.Exit(code)
}

// =============================================
// سياسة كلمات المرور
// =============================================

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name    string
		pw      string
		wantErr bool
	}{
		{"قصيرة جداً", "abc123", true},
		{"بلا أرقام", "abcdefghijk", true},
		{"بلا حروف", "1234567890123", true},
		{"شائعة", "password12", true},
		{"فارغة", "", true},
		{"صالحة", "Baghdad2026x", false},
		{"صالحة بالحد الأدنى", "abcde12345", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := validatePassword(tt.pw)
			if (got != "") != tt.wantErr {
				t.Errorf("validatePassword(%q) = %q، متوقع خطأ=%v", tt.pw, got, tt.wantErr)
			}
		})
	}
}

// =============================================
// تصنيف السرية والجهات الطالبة
// =============================================

func TestNormalizeConfidentiality(t *testing.T) {
	cases := map[string]string{
		"confidential": ConfidentialityConfidential,
		"public":       ConfidentialityPublic,
		"":             ConfidentialityPublic,
		"غير معروف":    ConfidentialityPublic,
		"CONFIDENTIAL": ConfidentialityPublic, // حساس لحالة الأحرف عمداً
	}
	for in, want := range cases {
		if got := normalizeConfidentiality(in); got != want {
			t.Errorf("normalizeConfidentiality(%q) = %q، متوقع %q", in, got, want)
		}
	}
}

func TestNormalizeRequesterType(t *testing.T) {
	for _, valid := range []string{"deputy", "presidency", "committee", "bloc_leader", "director", "advisor"} {
		if got := normalizeRequesterType(valid); got != valid {
			t.Errorf("normalizeRequesterType(%q) = %q", valid, got)
		}
	}
	for _, invalid := range []string{"", "hacker", "ADMIN"} {
		if got := normalizeRequesterType(invalid); got != "deputy" {
			t.Errorf("normalizeRequesterType(%q) = %q، متوقع deputy", invalid, got)
		}
	}
}

// =============================================
// أدوات مساعدة
// =============================================

func TestDedupeInts(t *testing.T) {
	got := dedupeInts([]int{3, 1, 3, 0, -2, 1, 5})
	want := []int{3, 1, 5}
	if len(got) != len(want) {
		t.Fatalf("dedupeInts = %v، متوقع %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("dedupeInts = %v، متوقع %v (الترتيب مهم)", got, want)
		}
	}
	if len(dedupeInts(nil)) != 0 {
		t.Error("dedupeInts(nil) يجب أن ترجع فارغة")
	}
}

func TestPlaceholders(t *testing.T) {
	cases := map[int]string{0: "", 1: "?", 3: "?,?,?"}
	for n, want := range cases {
		if got := placeholders(n); got != want {
			t.Errorf("placeholders(%d) = %q، متوقع %q", n, got, want)
		}
	}
}

func TestIsSlug(t *testing.T) {
	valid := []string{"research", "budget_research", "dept2"}
	invalid := []string{"", "Research", "قسم", "with-dash", "with space", string(make([]byte, 41))}
	for _, s := range valid {
		if !isSlug(s) {
			t.Errorf("isSlug(%q) يجب أن يكون صالحاً", s)
		}
	}
	for _, s := range invalid {
		if isSlug(s) {
			t.Errorf("isSlug(%q) يجب أن يكون غير صالح", s)
		}
	}
}

func TestSanitizeStripsHTML(t *testing.T) {
	got := sanitize(`<script>alert(1)</script>عنوان`)
	if got != "alert(1)عنوان" && got != "عنوان" {
		t.Errorf("sanitize لم تُزل الوسوم: %q", got)
	}
	// الترميز المزدوج: النص العربي يبقى كما هو
	if s := sanitize("دراسة & تحليل"); s != "دراسة & تحليل" {
		t.Errorf("sanitize رمّزت مزدوجاً: %q", s)
	}
}

func TestParseFlexibleDate(t *testing.T) {
	if _, err := parseFlexibleDate("2026-03-11"); err != nil {
		t.Errorf("YYYY-MM-DD يجب أن تُقبل: %v", err)
	}
	if _, err := parseFlexibleDate("2026-03-11T10:00:00Z"); err != nil {
		t.Errorf("RFC3339 يجب أن تُقبل: %v", err)
	}
	if _, err := parseFlexibleDate("11/03/2026"); err == nil {
		t.Error("صيغة غير مدعومة يجب أن تُرفض")
	}
}

func TestGenerateIDUnique(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 500; i++ {
		id := generateID("REQ")
		if seen[id] {
			t.Fatalf("تكرار في المعرّفات: %s", id)
		}
		seen[id] = true
	}
}

func TestGenerateReadablePasswordExcludesAmbiguous(t *testing.T) {
	for i := 0; i < 50; i++ {
		pw := generateReadablePassword(12)
		if len(pw) != 12 {
			t.Fatalf("طول غير متوقع: %d", len(pw))
		}
		for _, c := range pw {
			// O/0 وI/l/1 مستبعدة عمداً لتفادي اللبس عند التوزيع اليدوي
			if c == 'O' || c == '0' || c == 'I' || c == 'l' || c == '1' {
				t.Fatalf("حرف ملتبس في كلمة المرور: %q", pw)
			}
		}
	}
}

// =============================================
// حالة الأمان الدائمة
// =============================================

func TestTokenRevocationSurvives(t *testing.T) {
	token := "test-token-" + generateID("T")
	if IsTokenRevoked(token) {
		t.Fatal("رمز جديد يجب ألا يكون ملغى")
	}
	if err := RevokeToken(token, time.Now().Add(time.Hour)); err != nil {
		t.Fatalf("RevokeToken: %v", err)
	}
	if !IsTokenRevoked(token) {
		t.Error("الرمز يجب أن يكون ملغى بعد الإلغاء")
	}

	// الرمز المنتهي لا يُعتبر ملغى (يُنظَّف)
	expired := "expired-" + generateID("T")
	if err := RevokeToken(expired, time.Now().Add(-time.Hour)); err != nil {
		t.Fatalf("RevokeToken منتهٍ: %v", err)
	}
	if IsTokenRevoked(expired) {
		t.Error("الرمز المنتهي يجب ألا يُحسب ملغى")
	}
	PurgeExpiredTokens()
}

func TestAccountLockout(t *testing.T) {
	email := "lock-test@parliament.iq"
	defer func() { _, _ = db.DB.Exec("DELETE FROM login_attempts WHERE email = ?", email) }()

	if _, locked := AccountLockedUntil(email); locked {
		t.Fatal("الحساب يجب ألا يكون مقفلاً ابتداءً")
	}

	// دون الحد: لا قفل
	for i := 0; i < accountLockThreshold-1; i++ {
		RecordAccountAttempt(email, false)
	}
	if _, locked := AccountLockedUntil(email); locked {
		t.Fatalf("قُفل الحساب قبل بلوغ الحد (%d)", accountLockThreshold)
	}

	// عند الحد: يُقفل
	RecordAccountAttempt(email, false)
	if _, locked := AccountLockedUntil(email); !locked {
		t.Errorf("الحساب يجب أن يُقفل بعد %d محاولة", accountLockThreshold)
	}

	// النجاح يمسح السجل
	RecordAccountAttempt(email, true)
	if _, locked := AccountLockedUntil(email); locked {
		t.Error("الدخول الناجح يجب أن يفك القفل")
	}
}

// =============================================
// التحقّق من القيم المقيَّدة بـ CHECK في المخطط
//
// هذه الأعمدة كانت تُمرَّر للقاعدة بلا تحقّق، فينفجر القيد داخل INSERT
// ويعود 500 غامض بدل 400 مفهومة. الاختبارات تقفل الثغرة.
// =============================================

func TestNormalizePurpose(t *testing.T) {
	cases := []struct {
		in     string
		want   string
		wantOK bool
	}{
		{"oversight", "oversight", true},
		{"legislative", "legislative", true},
		{"other", "other", true},
		{"", "other", true},      // اختياري في النموذج
		{"  ", "other", true},    // فراغات فقط
		{"فحص", "", false},       // القيمة التي كانت تُنتج 500
		{"OVERSIGHT", "", false}, // حساس لحالة الأحرف
		{"'; DROP TABLE requests--", "", false},
	}
	for _, c := range cases {
		got, ok := normalizePurpose(c.in)
		if ok != c.wantOK || (ok && got != c.want) {
			t.Errorf("normalizePurpose(%q) = (%q, %v)، المتوقع (%q, %v)", c.in, got, ok, c.want, c.wantOK)
		}
	}
}

func TestValidateCommittees(t *testing.T) {
	cases := []struct {
		in      string
		wantBad string
	}{
		{"لجنة الأمن والدفاع", ""},
		{"اللجنة المالية", ""},
		{"أخرى", ""},
		{"", ""}, // الفارغ يُملأ من سجل المستخدم
		{"لجنة الأمن والدفاع، اللجنة المالية", ""},       // صيغة الواجهة متعددة اللجان
		{"لجنة الأمن والدفاع، لجنة وهمية", "لجنة وهمية"}, // واحدة صحيحة وأخرى لا
		{"لجنة غير موجودة", "لجنة غير موجودة"},
		{"<script>alert(1)</script>", "<script>alert(1)</script>"},
	}
	for _, c := range cases {
		if got := validateCommittees(c.in); got != c.wantBad {
			t.Errorf("validateCommittees(%q) = %q، المتوقع %q", c.in, got, c.wantBad)
		}
	}
}

func TestValidateConfirmation(t *testing.T) {
	if msg := validateConfirmation("دراسة", "علمي", 30); msg != "" {
		t.Errorf("قيم صحيحة رُفضت: %s", msg)
	}
	if msg := validateConfirmation("بحث", "علمي", 30); msg == "" {
		t.Error("نوع خدمة غير معتمد قُبل — كان ينتج 500 عند الإحالة")
	}
	if msg := validateConfirmation("دراسة", "عام", 30); msg == "" {
		t.Error("تصنيف غير معتمد قُبل — كان ينتج 500 عند الإحالة")
	}
	for _, d := range []int{0, -5, 366, 100000} {
		if msg := validateConfirmation("دراسة", "علمي", d); msg == "" {
			t.Errorf("مدة إنجاز غير منطقية قُبلت: %d", d)
		}
	}
}

// =============================================
// تمييز أخطاء العميل عن أعطال الخادم
//
// كان تكرار البريد أو معرّف القسم يعود 500، والإشارة لصفّ غير موجود كذلك.
// =============================================

func TestIsUniqueViolation(t *testing.T) {
	if !isUniqueViolation(errors.New("UNIQUE constraint failed: users.email")) {
		t.Error("لم يُميَّز تكرار البريد")
	}
	if !isUniqueViolation(errors.New("constraint failed: UNIQUE constraint failed: departments.id")) {
		t.Error("لم يُميَّز تكرار معرّف القسم")
	}
	if isUniqueViolation(errors.New("database is locked")) {
		t.Error("عطل خادم صُنِّف خطأ عميل")
	}
	if isUniqueViolation(nil) {
		t.Error("nil صُنِّف انتهاكاً")
	}
}

func TestIsForeignKeyViolation(t *testing.T) {
	if !isForeignKeyViolation(errors.New("FOREIGN KEY constraint failed")) {
		t.Error("لم يُميَّز انتهاك المفتاح الأجنبي")
	}
	if isForeignKeyViolation(errors.New("no such table: x")) {
		t.Error("خطأ آخر صُنِّف انتهاك مفتاح")
	}
	if isForeignKeyViolation(nil) {
		t.Error("nil صُنِّف انتهاكاً")
	}
}
