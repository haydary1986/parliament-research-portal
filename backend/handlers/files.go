package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"noab-backend/models"
)

const uploadDir = "uploads"

func init() {
	os.MkdirAll(uploadDir, 0755)
}

// POST /api/upload
func UploadFile(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)

	r.ParseMultipartForm(32 << 20) // 32MB max

	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "يرجى إرفاق ملف",
		})
		return
	}
	defer file.Close()

	// التحقق من نوع الملف
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowed := map[string]bool{".doc": true, ".docx": true, ".pdf": true}
	if !allowed[ext] {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "نوع الملف غير مسموح. المسموح: DOC, DOCX, PDF",
		})
		return
	}

	// التحقق من محتوى الملف (MIME type)
	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	mimeType := http.DetectContentType(buf[:n])
	file.Seek(0, 0) // إعادة المؤشر للبداية

	allowedMime := map[string]bool{
		"application/pdf":                                                        true,
		"application/msword":                                                     true,
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
		"application/zip": true, // docx is zip-based
	}
	if !allowedMime[mimeType] {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "محتوى الملف لا يتطابق مع النوع المسموح",
		})
		return
	}

	// إنشاء اسم فريد آمن (بدون اسم الملف الأصلي لمنع path traversal)
	filename := fmt.Sprintf("%d_%d%s", userID, time.Now().UnixNano(), ext)
	filePath := filepath.Join(uploadDir, filename)

	dst, err := os.Create(filePath)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل حفظ الملف",
		})
		return
	}
	defer dst.Close()

	io.Copy(dst, file)

	writeJSON(w, http.StatusOK, models.APIResponse{
		Success: true,
		Message: "تم رفع الملف بنجاح",
		Data: map[string]string{
			"filename":      filename,
			"original_name": header.Filename,
			"url":           "/api/files/" + filename,
		},
	})
}

// GET /api/files/{filename}
func ServeFile(w http.ResponseWriter, r *http.Request) {
	filename := r.PathValue("filename")

	// منع path traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") {
		http.Error(w, "غير مسموح", http.StatusForbidden)
		return
	}

	filePath := filepath.Join(uploadDir, filename)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		writeJSON(w, http.StatusNotFound, models.APIResponse{
			Success: false, Message: "الملف غير موجود",
		})
		return
	}

	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeFile(w, r, filePath)
}
