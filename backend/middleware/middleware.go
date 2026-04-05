package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "user_id"
const UserRoleKey contextKey = "user_role"
const UserDeptKey contextKey = "user_dept"
const TokenKey contextKey = "token_raw"

// =============================================
// JWT
// =============================================
var JWTSecret []byte

func InitJWT() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		if os.Getenv("GO_ENV") == "production" {
			log.Fatal("❌ JWT_SECRET مطلوب في بيئة الإنتاج. عيّن المتغير وأعد التشغيل")
		}
		// مفتاح عشوائي قوي للتطوير
		b := make([]byte, 32)
		rand.Read(b)
		secret = hex.EncodeToString(b)
		log.Println("⚠️  تحذير: JWT_SECRET غير محدد. تم توليد مفتاح عشوائي مؤقت")
		log.Println("⚠️  ملاحظة: الـ tokens ستنتهي عند إعادة تشغيل السيرفر")
	} else if len(secret) < 32 {
		log.Fatal("❌ JWT_SECRET يجب أن يكون 32 حرف على الأقل")
	}
	JWTSecret = []byte(secret)
}

func GenerateToken(userID int, role string, departmentID string) (string, error) {
	// Token قصير المدة (8 ساعات بدل 24)
	claims := jwt.MapClaims{
		"user_id":    userID,
		"role":       role,
		"department": departmentID,
		"exp":        time.Now().Add(8 * time.Hour).Unix(),
		"iat":        time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTSecret)
}

// =============================================
// Token Blacklist (لتسجيل الخروج)
// =============================================
var (
	blacklistMu sync.RWMutex
	blacklist   = make(map[string]time.Time) // token -> expiry time
)

func BlacklistToken(tokenStr string, expiry time.Time) {
	blacklistMu.Lock()
	defer blacklistMu.Unlock()
	blacklist[tokenStr] = expiry
}

func IsBlacklisted(tokenStr string) bool {
	blacklistMu.RLock()
	defer blacklistMu.RUnlock()
	_, exists := blacklist[tokenStr]
	return exists
}

// تنظيف الـ tokens المنتهية كل ساعة
func init() {
	go func() {
		for {
			time.Sleep(1 * time.Hour)
			blacklistMu.Lock()
			now := time.Now()
			for token, expiry := range blacklist {
				if now.After(expiry) {
					delete(blacklist, token)
				}
			}
			blacklistMu.Unlock()
		}
	}()
}

// =============================================
// CORS
// =============================================
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowedOrigins := map[string]bool{
			"http://localhost:5173":  true,
			"https://localhost:5173": true,
			"http://localhost:3000":  true,
			"https://localhost:3000": true,
		}
		// في الإنتاج: أضف الدومين الحقيقي
		if prodOrigin := os.Getenv("ALLOWED_ORIGIN"); prodOrigin != "" {
			allowedOrigins[prodOrigin] = true
		}

		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else if origin == "" {
			w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Security headers
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		// HSTS عند استخدام TLS
		if r.TLS != nil {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// =============================================
// Logger
// =============================================
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s %s", r.Method, r.URL.Path, time.Since(start), r.RemoteAddr)
	})
}

// =============================================
// Rate Limiting - تصاعدي
// =============================================
var (
	rateMu        sync.Mutex
	loginAttempts = make(map[string]int)
	loginBlock    = make(map[string]time.Time)
	suspiciousIPs = make(map[string]int) // عداد IPs المشبوهة
)

func RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		rateMu.Lock()
		blockUntil, blocked := loginBlock[ip]
		rateMu.Unlock()
		if blocked && time.Now().Before(blockUntil) {
			remaining := time.Until(blockUntil).Seconds()
			msg := fmt.Sprintf(`{"success":false,"message":"تم حظرك مؤقتاً. حاول بعد %.0f ثانية"}`, remaining)
			http.Error(w, msg, http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func RecordLoginAttempt(ip string, success bool) {
	rateMu.Lock()
	defer rateMu.Unlock()
	if success {
		delete(loginAttempts, ip)
		delete(loginBlock, ip)
		return
	}
	loginAttempts[ip]++
	suspiciousIPs[ip]++
	count := loginAttempts[ip]
	totalFails := suspiciousIPs[ip]

	// حظر تصاعدي
	var blockDuration time.Duration
	switch {
	case count >= 10:
		blockDuration = 30 * time.Minute
		log.Printf("🚨 تنبيه أمني: IP %s حاول تسجيل الدخول %d مرة فاشلة! حظر 30 دقيقة", ip, totalFails)
	case count >= 7:
		blockDuration = 10 * time.Minute
		log.Printf("⚠️  تحذير: IP %s حاول %d محاولات فاشلة. حظر 10 دقائق", ip, count)
	case count >= 5:
		blockDuration = 2 * time.Minute
	case count >= 3:
		blockDuration = 30 * time.Second
	default:
		return
	}

	loginBlock[ip] = time.Now().Add(blockDuration)
	loginAttempts[ip] = 0
}

// إحصائيات الأمان
func GetSecurityStats() map[string]interface{} {
	rateMu.Lock()
	defer rateMu.Unlock()
	blocked := 0
	for _, until := range loginBlock {
		if time.Now().Before(until) {
			blocked++
		}
	}
	return map[string]interface{}{
		"blocked_ips":    blocked,
		"suspicious_ips": len(suspiciousIPs),
	}
}

// =============================================
// Auth - JWT
// =============================================
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"success":false,"message":"غير مصرح"}`, http.StatusUnauthorized)
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		// فحص القائمة السوداء
		if IsBlacklisted(tokenStr) {
			http.Error(w, `{"success":false,"message":"تم تسجيل الخروج. سجّل دخول مجدداً"}`, http.StatusUnauthorized)
			return
		}

		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return JWTSecret, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, `{"success":false,"message":"جلسة غير صالحة أو منتهية"}`, http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, `{"success":false,"message":"خطأ في التحقق"}`, http.StatusUnauthorized)
			return
		}

		uidFloat, ok1 := claims["user_id"].(float64)
		role, ok2 := claims["role"].(string)
		if !ok1 || !ok2 {
			http.Error(w, `{"success":false,"message":"بيانات الجلسة غير صالحة"}`, http.StatusUnauthorized)
			return
		}
		userID := int(uidFloat)
		dept := ""
		if d, ok := claims["department"].(string); ok {
			dept = d
		}

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, UserRoleKey, role)
		ctx = context.WithValue(ctx, UserDeptKey, dept)
		ctx = context.WithValue(ctx, TokenKey, tokenStr)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// =============================================
// RoleAuth
// =============================================
func RoleAuth(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role, ok := r.Context().Value(UserRoleKey).(string)
			if !ok {
				http.Error(w, `{"success":false,"message":"غير مصرح"}`, http.StatusUnauthorized)
				return
			}

			for _, allowed := range roles {
				if role == allowed {
					next.ServeHTTP(w, r)
					return
				}
			}

			http.Error(w, `{"success":false,"message":"صلاحيات غير كافية"}`, http.StatusForbidden)
		})
	}
}

// BodyLimit - حد أقصى لحجم الطلب (1MB)
func BodyLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.ContentLength > 1<<20 { // 1MB
			http.Error(w, `{"success":false,"message":"حجم الطلب كبير جداً"}`, http.StatusRequestEntityTooLarge)
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		next.ServeHTTP(w, r)
	})
}

func AuthWithRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return Auth(RoleAuth(roles...)(next))
	}
}
