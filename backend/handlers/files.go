package handlers

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"noab-backend/models"
)

const (
	uploadDir   = "uploads"
	maxFileSize = 10 << 20 // 10 MB سقف للملف الواحد
)

func init() {
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Printf("⚠️  فشل إنشاء مجلد الرفع: %v", err)
	}
}

// magic bytes للتحقق من docx (ZIP signature) - مطلوب وجود "word/" داخل zip
var (
	pdfMagic     = []byte("%PDF-")
	zipMagic     = []byte("PK\x03\x04")
	docMagic     = []byte{0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1} // OLE compound (legacy .doc)
	docxKeywords = []byte("word/")                                         // يجب أن يحتوي docx على هذا
)

// detectFileType يفحص magic bytes ويرفض ZIP عام غير docx
func detectFileType(buf []byte, ext string) (string, bool) {
	if bytes.HasPrefix(buf, pdfMagic) && ext == ".pdf" {
		return "pdf", true
	}
	if bytes.HasPrefix(buf, docMagic) && ext == ".doc" {
		return "doc", true
	}
	if bytes.HasPrefix(buf, zipMagic) && ext == ".docx" {
		// التحقق من وجود محتوى docx داخل ZIP (ليس مجرد أي ZIP)
		if bytes.Contains(buf, docxKeywords) {
			return "docx", true
		}
	}
	return "", false
}

// POST /api/upload
func UploadFile(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)

	// حد المحتوى أصلاً قبل البارس
	r.Body = http.MaxBytesReader(w, r.Body, maxFileSize+1024)
	if err := r.ParseMultipartForm(maxFileSize); err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "حجم الملف كبير جداً أو طلب غير صالح",
		})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "يرجى إرفاق ملف",
		})
		return
	}
	defer file.Close()

	if header.Size > maxFileSize {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "حجم الملف يتجاوز 10 ميجابايت",
		})
		return
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowed := map[string]bool{".doc": true, ".docx": true, ".pdf": true}
	if !allowed[ext] {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "نوع الملف غير مسموح. المسموح: DOC, DOCX, PDF",
		})
		return
	}

	// قراءة أول 2KB للفحص (يكفي لـ magic bytes + بداية محتوى docx)
	buf := make([]byte, 2048)
	n, _ := file.Read(buf)
	if _, err := file.Seek(0, 0); err != nil {
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "خطأ في قراءة الملف"})
		return
	}

	if _, ok := detectFileType(buf[:n], ext); !ok {
		writeJSON(w, http.StatusBadRequest, models.APIResponse{
			Success: false, Message: "محتوى الملف لا يطابق الامتداد. المسموح فقط: مستندات Word وPDF أصلية",
		})
		return
	}

	filename := fmt.Sprintf("%d_%d%s", userID, time.Now().UnixNano(), ext)
	filePath := filepath.Join(uploadDir, filename)

	dst, err := os.Create(filePath)
	if err != nil {
		log.Printf("UploadFile create failed: %v", err)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{
			Success: false, Message: "فشل حفظ الملف",
		})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		log.Printf("UploadFile copy failed: %v", err)
		_ = os.Remove(filePath)
		writeJSON(w, http.StatusInternalServerError, models.APIResponse{Success: false, Message: "فشل حفظ الملف"})
		return
	}

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
