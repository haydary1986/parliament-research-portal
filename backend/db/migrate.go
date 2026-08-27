package db

import (
	"fmt"
	"log"
	"strings"
)

// =============================================
// نظام الترحيل - Schema Migrations
// =============================================
// schema.sql يستخدم CREATE TABLE IF NOT EXISTS، ما يعني أن أي عمود جديد
// لا يُنشأ على قاعدة بيانات موجودة مسبقاً (مثل قاعدة الإنتاج داخل الـ volume).
// هذه الوحدة تسدّ تلك الفجوة: تفحص المخطط الحالي وتطبّق ما ينقصه فقط.
//
// كل الدوال هنا **idempotent** — تشغيلها مراراً آمن ولا يكرر أي تغيير.

// Migrate يطبّق كل الترحيلات المطلوبة بالترتيب.
// يُستدعى بعد Init() وقبل Seed().
func Migrate() error {
	// نوع الجهة الطالبة على المستخدم (نواب/رئاسات/لجان/رؤساء الكتل/مدراء/مستشارين)
	if err := addColumnIfMissing("users", "requester_type", "TEXT DEFAULT 'deputy'"); err != nil {
		return fmt.Errorf("ترحيل users.requester_type: %w", err)
	}

	// جدول requests يحتاج إعادة بناء: أعمدة جديدة + توسيع قيد CHECK على status
	if err := rebuildRequestsIfOutdated(); err != nil {
		return fmt.Errorf("ترحيل جدول requests: %w", err)
	}

	return nil
}

// =============================================
// أدوات مساعدة
// =============================================

// tableColumns يُرجع أسماء أعمدة جدول عبر PRAGMA table_info
func tableColumns(table string) ([]string, error) {
	rows, err := DB.Query(fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cols []string
	for rows.Next() {
		var cid int
		var name, colType string
		var notNull, pk int
		var dflt any
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dflt, &pk); err != nil {
			return nil, err
		}
		cols = append(cols, name)
	}
	return cols, rows.Err()
}

func hasColumn(table, column string) (bool, error) {
	cols, err := tableColumns(table)
	if err != nil {
		return false, err
	}
	for _, c := range cols {
		if c == column {
			return true, nil
		}
	}
	return false, nil
}

// addColumnIfMissing يضيف عموداً إن لم يكن موجوداً (آمن للتكرار)
func addColumnIfMissing(table, column, decl string) error {
	exists, err := hasColumn(table, column)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	if _, err := DB.Exec(fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", table, column, decl)); err != nil {
		return err
	}
	log.Printf("✓ ترحيل: أُضيف العمود %s.%s", table, column)
	return nil
}

// extractCreateTable يستخرج جملة CREATE TABLE لجدول محدد من schema.sql المضمَّن.
// هذا يبقي تعريف الجدول في مصدر واحد (schema.sql) بدل تكراره داخل الترحيل.
func extractCreateTable(table string) (string, error) {
	marker := fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s (", table)
	start := strings.Index(schemaSQL, marker)
	if start < 0 {
		return "", fmt.Errorf("لم يُعثر على تعريف الجدول %s في schema.sql", table)
	}
	rest := schemaSQL[start:]
	// نهاية الجملة: أول ");" في بداية سطر
	end := strings.Index(rest, "\n);")
	if end < 0 {
		return "", fmt.Errorf("تعريف الجدول %s غير مكتمل في schema.sql", table)
	}
	return rest[:end+len("\n);")], nil
}

// =============================================
// ترحيل جدول requests
// =============================================

// requestsIndexes الفهارس التي يجب إعادة إنشاؤها بعد إعادة بناء الجدول
// (الفهارس تُحذف تلقائياً مع DROP TABLE)
var requestsIndexes = []string{
	"CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status)",
	"CREATE INDEX IF NOT EXISTS idx_requests_deputy ON requests(deputy_id)",
	"CREATE INDEX IF NOT EXISTS idx_requests_department ON requests(assigned_department)",
}

// rebuildRequestsIfOutdated يعيد بناء جدول requests عند الحاجة.
//
// السبب: SQLite لا يسمح بتعديل قيد CHECK عبر ALTER TABLE، وحالة
// 'pending_manager_send' الجديدة سترفضها قاعدة الإنتاج القائمة.
// نتبع إجراء SQLite الرسمي: جدول جديد → نسخ → حذف القديم → إعادة تسمية.
func rebuildRequestsIfOutdated() error {
	var storedSQL string
	err := DB.QueryRow(
		"SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'requests'",
	).Scan(&storedSQL)
	if err != nil {
		return fmt.Errorf("قراءة تعريف جدول requests: %w", err)
	}

	// المخطط محدَّث مسبقاً؟ لا شيء لفعله
	upToDate := strings.Contains(storedSQL, "pending_manager_send") &&
		strings.Contains(storedSQL, "confidentiality") &&
		strings.Contains(storedSQL, "requester_type")
	if upToDate {
		return nil
	}

	log.Println("⏳ ترحيل: إعادة بناء جدول requests (أعمدة السرية والجهة الطالبة + حالة جديدة)...")

	createStmt, err := extractCreateTable("requests")
	if err != nil {
		return err
	}
	createNew := strings.Replace(createStmt,
		"CREATE TABLE IF NOT EXISTS requests (",
		"CREATE TABLE requests_new (", 1)

	// الأعمدة المشتركة بين الجدول القديم والجديد (القديم مجموعة جزئية من الجديد)
	oldCols, err := tableColumns("requests")
	if err != nil {
		return err
	}

	// إيقاف قيود المفاتيح الأجنبية أثناء إعادة البناء
	// (يجب أن يكون خارج المعاملة — SQLite يتجاهل هذا الـ PRAGMA داخلها)
	if _, err := DB.Exec("PRAGMA foreign_keys = OFF"); err != nil {
		return fmt.Errorf("تعطيل foreign_keys: %w", err)
	}
	defer func() {
		if _, err := DB.Exec("PRAGMA foreign_keys = ON"); err != nil {
			log.Printf("⚠️  فشل إعادة تفعيل foreign_keys: %v", err)
		}
	}()

	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			if rbErr := tx.Rollback(); rbErr != nil {
				log.Printf("⚠️  فشل التراجع عن ترحيل requests: %v", rbErr)
			}
		}
	}()

	if _, err := tx.Exec(createNew); err != nil {
		return fmt.Errorf("إنشاء requests_new: %w", err)
	}

	// نسخ الأعمدة الموجودة فقط — الأعمدة الجديدة تأخذ قيمها الافتراضية
	colList := strings.Join(oldCols, ", ")
	if _, err := tx.Exec(fmt.Sprintf(
		"INSERT INTO requests_new (%s) SELECT %s FROM requests", colList, colList,
	)); err != nil {
		return fmt.Errorf("نسخ بيانات requests: %w", err)
	}

	if _, err := tx.Exec("DROP TABLE requests"); err != nil {
		return fmt.Errorf("حذف جدول requests القديم: %w", err)
	}
	// إعادة التسمية آمنة هنا: لا جدول آخر يشير إلى requests_new
	if _, err := tx.Exec("ALTER TABLE requests_new RENAME TO requests"); err != nil {
		return fmt.Errorf("إعادة تسمية requests_new: %w", err)
	}

	for _, idx := range requestsIndexes {
		if _, err := tx.Exec(idx); err != nil {
			return fmt.Errorf("إعادة إنشاء الفهرس: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("تثبيت ترحيل requests: %w", err)
	}
	committed = true

	// فحص سلامة المفاتيح الأجنبية بعد إعادة البناء
	if rows, err := DB.Query("PRAGMA foreign_key_check"); err == nil {
		violations := 0
		for rows.Next() {
			violations++
		}
		rows.Close()
		if violations > 0 {
			log.Printf("⚠️  تحذير: %d مخالفة مفاتيح أجنبية بعد الترحيل", violations)
		}
	}

	log.Println("✓ ترحيل: أُعيد بناء جدول requests بنجاح")
	return nil
}
