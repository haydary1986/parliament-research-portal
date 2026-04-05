package db

import (
	"database/sql"
	"embed"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
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
