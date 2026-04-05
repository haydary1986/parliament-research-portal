package handlers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync/atomic"
	"time"

	"noab-backend/db"
	"noab-backend/middleware"

	"github.com/microcosm-cc/bluemonday"
)

// تنظيف HTML من المدخلات
var sanitizer = bluemonday.StrictPolicy()

func sanitize(s string) string {
	return sanitizer.Sanitize(s)
}

func sanitizePtr(s *string) *string {
	if s == nil {
		return nil
	}
	cleaned := sanitize(*s)
	return &cleaned
}

// مولّد ID آمن من race conditions
var idCounter atomic.Int64

func init() {
	idCounter.Store(time.Now().UnixMilli())
}

func generateID(prefix string) string {
	n := idCounter.Add(1)
	b := make([]byte, 4)
	rand.Read(b)
	return fmt.Sprintf("%s-%d-%x", prefix, n%100000, b)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func getUserID(r *http.Request) int {
	if id, ok := r.Context().Value(middleware.UserIDKey).(int); ok {
		return id
	}
	return 0
}

func getUserRole(r *http.Request) string {
	if role, ok := r.Context().Value(middleware.UserRoleKey).(string); ok {
		return role
	}
	return ""
}

func getQueryInt(r *http.Request, key string, defaultVal int) int {
	val := r.URL.Query().Get(key)
	if val == "" {
		return defaultVal
	}
	i, err := strconv.Atoi(val)
	if err != nil {
		return defaultVal
	}
	// حد أقصى وأدنى للـ pagination
	if key == "limit" && (i > 100 || i < 1) {
		return defaultVal
	}
	if key == "page" && i < 1 {
		return 1
	}
	return i
}

func logActivity(userID int, userName, action string, entityType, entityID *string, details string) {
	db.DB.Exec(`
		INSERT INTO activity_logs (user_id, user_name, action, entity_type, entity_id, details)
		VALUES (?, ?, ?, ?, ?, ?)
	`, userID, userName, action, entityType, entityID, details)
}

func createNotification(userID int, title, message, notifType string, entityType, entityID *string) {
	db.DB.Exec(`
		INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
		VALUES (?, ?, ?, ?, ?, ?)
	`, userID, title, message, notifType, entityType, entityID)
}

func strPtr(s string) *string {
	return &s
}
