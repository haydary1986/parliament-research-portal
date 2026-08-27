package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// =============================================
// إشعارات SMS
// =============================================
// كان الإشعار سطراً في السجل فقط. هذه الوحدة ترسل فعلياً عبر HTTP،
// في الخلفية ومع إعادة محاولة — فلا يفشل تسليم البحث لأن المزوّد تعطّل.
//
// الضبط عبر متغيرات البيئة:
//   SMS_ENDPOINT  رابط المزوّد (POST). فارغ ⇒ التسجيل فقط (السلوك السابق)
//   SMS_TOKEN     رمز المصادقة، يُرسل في ترويسة Authorization: Bearer
//   SMS_SENDER    اسم المرسل المعتمد لدى المزوّد
//
// جسم الطلب: {"to": "...", "message": "...", "sender": "..."}
// معظم مزوّدي الرسائل العراقيين يقبلون هذا الشكل أو قريباً منه؛
// عدّل buildSMSPayload إن اختلف عقد المزوّد.

const (
	smsTimeout     = 12 * time.Second
	smsMaxAttempts = 3
	smsRetryDelay  = 4 * time.Second
)

var smsClient = &http.Client{Timeout: smsTimeout}

// SMSConfigured يبيّن ما إذا كان الإرسال الفعلي مفعّلاً
func SMSConfigured() bool {
	return os.Getenv("SMS_ENDPOINT") != ""
}

// normalizePhone يحوّل الأرقام العراقية إلى الصيغة الدولية.
// 07XXXXXXXXX → +9647XXXXXXXXX
func normalizePhone(raw string) string {
	p := strings.TrimSpace(raw)
	p = strings.NewReplacer(" ", "", "-", "", "(", "", ")", "").Replace(p)
	switch {
	case strings.HasPrefix(p, "+"):
		return p
	case strings.HasPrefix(p, "00"):
		return "+" + p[2:]
	case strings.HasPrefix(p, "07") && len(p) == 11:
		return "+964" + p[1:]
	case strings.HasPrefix(p, "964"):
		return "+" + p
	}
	return p
}

func buildSMSPayload(to, message string) ([]byte, error) {
	return json.Marshal(map[string]string{
		"to":      to,
		"message": message,
		"sender":  os.Getenv("SMS_SENDER"),
	})
}

// SendSMS يرسل رسالة في الخلفية.
// لا يُرجع خطأً عمداً: فشل الإشعار يجب ألا يُفشل العملية التي استدعته.
func SendSMS(rawPhone, message string) {
	phone := normalizePhone(rawPhone)
	if phone == "" {
		return
	}

	if !SMSConfigured() {
		// السلوك السابق حين لا يوجد مزوّد مضبوط
		log.Printf("📱 SMS (غير مفعّل — سجل فقط) → %s: %s", phone, message)
		return
	}

	go func() {
		var lastErr error
		for attempt := 1; attempt <= smsMaxAttempts; attempt++ {
			if err := sendSMSOnce(phone, message); err != nil {
				lastErr = err
				log.Printf("⚠️  فشل إرسال SMS إلى %s (محاولة %d/%d): %v",
					phone, attempt, smsMaxAttempts, err)
				if attempt < smsMaxAttempts {
					time.Sleep(smsRetryDelay * time.Duration(attempt))
				}
				continue
			}
			log.Printf("📱 ✓ أُرسلت SMS إلى %s", phone)
			return
		}
		log.Printf("🚨 تعذّر إرسال SMS إلى %s بعد %d محاولات: %v",
			phone, smsMaxAttempts, lastErr)
	}()
}

func sendSMSOnce(phone, message string) error {
	body, err := buildSMSPayload(phone, message)
	if err != nil {
		return fmt.Errorf("تجهيز الطلب: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), smsTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		os.Getenv("SMS_ENDPOINT"), bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("إنشاء الطلب: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if tok := os.Getenv("SMS_TOKEN"); tok != "" {
		req.Header.Set("Authorization", "Bearer "+tok)
	}

	resp, err := smsClient.Do(req)
	if err != nil {
		return fmt.Errorf("الاتصال بالمزوّد: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	return fmt.Errorf("المزوّد أعاد %d", resp.StatusCode)
}
