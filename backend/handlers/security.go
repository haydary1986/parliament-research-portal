package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"time"

	"noab-backend/db"
)

// =============================================
// حالة الأمان المحفوظة في قاعدة البيانات
// =============================================
// القائمة السوداء وعدّادات المحاولات كانت في ذاكرة العملية، فتضيع عند كل
// إعادة تشغيل أو نشر: تعود الرموز المسجَّل خروجها صالحة، وتُصفَّر محاولات
// الاختراق. حفظها هنا يجعلها تنجو من النشر — وهو مهم بعد تفعيل النشر التلقائي.

// hashToken لا نخزّن الرمز نفسه بل بصمته، فتسريب الجدول لا يمنح جلسات
func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// RevokeToken يضيف رمزاً إلى القائمة السوداء الدائمة
func RevokeToken(token string, expiry time.Time) error {
	_, err := db.DB.Exec(
		"INSERT OR REPLACE INTO revoked_tokens (token_hash, expires_at) VALUES (?, ?)",
		hashToken(token), expiry.Unix(),
	)
	return err
}

// IsTokenRevoked يفحص القائمة السوداء الدائمة
func IsTokenRevoked(token string) bool {
	var n int
	err := db.DB.QueryRow(
		"SELECT COUNT(*) FROM revoked_tokens WHERE token_hash = ? AND expires_at > ?",
		hashToken(token), time.Now().Unix(),
	).Scan(&n)
	if err != nil {
		// عند فشل الفحص نرفض الرمز — الأمان قبل التوافر
		log.Printf("⚠️  فحص القائمة السوداء فشل: %v", err)
		return true
	}
	return n > 0
}

// PurgeExpiredTokens ينظف الرموز المنتهية
func PurgeExpiredTokens() {
	if _, err := db.DB.Exec("DELETE FROM revoked_tokens WHERE expires_at <= ?", time.Now().Unix()); err != nil {
		logErr("PurgeExpiredTokens", err)
	}
}

// StartTokenCleanup يبدأ تنظيفاً دورياً كل ساعة
func StartTokenCleanup() {
	go func() {
		t := time.NewTicker(time.Hour)
		defer t.Stop()
		for range t.C {
			PurgeExpiredTokens()
		}
	}()
}

// =============================================
// قفل الحساب
// =============================================
// الحظر التصاعدي القائم يقيّد عنوان الـ IP وحده، فهجوم موزّع على حساب واحد
// لا يوقفه شيء. هذا القفل يقيّد الحساب نفسه.

const (
	accountLockThreshold = 8
	accountLockDuration  = 15 * time.Minute
)

// AccountLockedUntil يرجع وقت انتهاء القفل إن كان الحساب مقفلاً
func AccountLockedUntil(email string) (time.Time, bool) {
	var until *time.Time
	err := db.DB.QueryRow("SELECT locked_until FROM login_attempts WHERE email = ?", email).Scan(&until)
	if err != nil || until == nil {
		return time.Time{}, false
	}
	if time.Now().Before(*until) {
		return *until, true
	}
	return time.Time{}, false
}

// RecordAccountAttempt يسجّل محاولة دخول ويقفل الحساب عند تجاوز الحد
func RecordAccountAttempt(email string, success bool) {
	if success {
		if _, err := db.DB.Exec("DELETE FROM login_attempts WHERE email = ?", email); err != nil {
			logErr("RecordAccountAttempt reset", err)
		}
		return
	}

	if _, err := db.DB.Exec(`
		INSERT INTO login_attempts (email, fail_count, last_attempt)
		VALUES (?, 1, CURRENT_TIMESTAMP)
		ON CONFLICT(email) DO UPDATE SET
		  fail_count = fail_count + 1,
		  last_attempt = CURRENT_TIMESTAMP
	`, email); err != nil {
		logErr("RecordAccountAttempt increment", err)
		return
	}

	var count int
	logErr("RecordAccountAttempt count",
		db.DB.QueryRow("SELECT fail_count FROM login_attempts WHERE email = ?", email).Scan(&count))

	if count >= accountLockThreshold {
		until := time.Now().Add(accountLockDuration)
		if _, err := db.DB.Exec(
			"UPDATE login_attempts SET locked_until = ?, fail_count = 0 WHERE email = ?", until, email,
		); err != nil {
			logErr("RecordAccountAttempt lock", err)
			return
		}
		log.Printf("🔒 قفل الحساب %s لمدة %v بعد %d محاولة فاشلة", email, accountLockDuration, count)
	}
}

// LockedAccountsCount عدد الحسابات المقفلة حالياً — لإحصائيات الأمان.
// نستخدم datetime() لتوحيد الصيغة: الدرايفر يكتب ISO8601 بينما
// CURRENT_TIMESTAMP بصيغة أخرى، والمقارنة النصية بينهما غير موثوقة.
func LockedAccountsCount() int {
	var n int
	logErr("LockedAccountsCount", db.DB.QueryRow(
		"SELECT COUNT(*) FROM login_attempts WHERE locked_until IS NOT NULL AND datetime(locked_until) > datetime('now')",
	).Scan(&n))
	return n
}

// FormatLockMessage رسالة عربية موحّدة عند القفل
func FormatLockMessage(until time.Time) string {
	mins := int(time.Until(until).Minutes()) + 1
	return fmt.Sprintf("تم قفل الحساب مؤقتاً بعد محاولات فاشلة متكررة. حاول بعد %d دقيقة", mins)
}

// CurrentAccount يعيد الدور الحالي وحالة النشاط للمستخدم من القاعدة.
// يُحقن في middleware.AccountChecker ليُبطِل جلسة الحساب المعطَّل فوراً
// ويجعل تغيير الدور يسري دون انتظار انتهاء الرمز.
func CurrentAccount(userID int) (string, bool) {
	var role, status string
	if err := db.DB.QueryRow(
		"SELECT role, status FROM users WHERE id = ?", userID,
	).Scan(&role, &status); err != nil {
		return "", false // غير موجود ⇒ غير نشط
	}
	return role, status == "active"
}
