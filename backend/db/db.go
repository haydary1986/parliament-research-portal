package db

import (
	"database/sql"
	"embed"
	"fmt"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

//go:embed schema.sql
var schemaSQL string

//go:embed seed.sql
var seedSQL string

var DB *sql.DB

func Init(dbPath string) error {
	var err error
	DB, err = sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_foreign_keys=ON")
	if err != nil {
		return fmt.Errorf("فشل فتح قاعدة البيانات: %w", err)
	}

	if err = DB.Ping(); err != nil {
		return fmt.Errorf("فشل الاتصال بقاعدة البيانات: %w", err)
	}

	// تنفيذ مخطط قاعدة البيانات
	if _, err = DB.Exec(schemaSQL); err != nil {
		return fmt.Errorf("فشل إنشاء الجداول: %w", err)
	}

	log.Println("✓ تم تهيئة قاعدة البيانات بنجاح")
	return nil
}

// ResetAdminPasswordIfRequested يفحص env var ADMIN_PWD_RESET
// إذا كان مُعيَّناً، يعيد تعيين كلمة مرور admin@parliament.iq
// مفيد للحالات التي تكون فيها قاعدة البيانات قديمة وفقدنا الوصول للأدمن
func ResetAdminPasswordIfRequested() error {
	newPwd := os.Getenv("ADMIN_PWD_RESET")
	if newPwd == "" {
		return nil
	}
	if len(newPwd) < 10 {
		log.Printf("⚠️  ADMIN_PWD_RESET مُعيَّن لكن أقل من 10 أحرف - تجاهل")
		return nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPwd), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("توليد hash فشل: %w", err)
	}

	result, err := DB.Exec(
		"UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = 'admin@parliament.iq'",
		string(hash),
	)
	if err != nil {
		return fmt.Errorf("تحديث كلمة مرور admin: %w", err)
	}

	affected, _ := result.RowsAffected()
	if affected > 0 {
		log.Printf("✓ تم إعادة تعيين كلمة مرور admin@parliament.iq (يجب إزالة ADMIN_PWD_RESET الآن)")
	} else {
		log.Println("⚠️  ADMIN_PWD_RESET مُعيَّن لكن لا يوجد مستخدم admin@parliament.iq")
	}
	return nil
}

func Seed() error {
	// تحقق إذا البيانات موجودة
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		log.Println("✓ البيانات التجريبية موجودة مسبقاً")
		return nil
	}

	if _, err = DB.Exec(seedSQL); err != nil {
		return fmt.Errorf("فشل إدخال البيانات التجريبية: %w", err)
	}

	log.Println("✓ تم إدخال البيانات التجريبية بنجاح")
	return nil
}

// Embed variable for external access
var SchemaFS embed.FS
