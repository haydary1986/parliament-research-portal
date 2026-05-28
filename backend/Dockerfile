# =========================================
# Stage 1: Builder
# =========================================
FROM golang:1.25-alpine AS builder

# gcc + musl-dev مطلوبان لـ CGO الذي يحتاجه go-sqlite3
RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /build

# تنزيل dependencies في طبقة منفصلة للاستفادة من cache
COPY go.mod go.sum ./
RUN go mod download

# نسخ الكود وبنائه
COPY . .

# البناء مع CGO_ENABLED=1 (مطلوب لـ go-sqlite3)
# -ldflags='-s -w' لتقليل حجم الباينري
# -trimpath لإزالة المسارات المطلقة من stack traces
RUN CGO_ENABLED=1 GOOS=linux \
    go build -trimpath -ldflags='-s -w -extldflags "-static"' \
    -o /noab-server .

# =========================================
# Stage 2: Runtime (minimal Alpine)
# =========================================
FROM alpine:3.20

# ca-certificates للـ HTTPS outbound requests (إن لزم)
# tzdata لدعم المنطقة الزمنية
RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S noab && adduser -S noab -G noab

WORKDIR /app

# نسخ الباينري فقط
COPY --from=builder /noab-server /app/noab-server

# إنشاء مجلدات البيانات والملفات المرفوعة
# هذه المجلدات ستكون mount points للـ volumes الخارجية
RUN mkdir -p /app/data /app/uploads && \
    chown -R noab:noab /app

# 🔒 عزل قاعدة البيانات والملفات
# DB_PATH يشير لداخل volume خارجي → البيانات تنجو من إعادة البناء
ENV DB_PATH=/app/data/noab.db \
    PORT=8080 \
    GO_ENV=production

# Volumes للبيانات المُستدامة (يجب أن تكون mount points حقيقية في الإنتاج)
VOLUME ["/app/data", "/app/uploads"]

# تشغيل كمستخدم non-root
USER noab

EXPOSE 8080

# Health check - endpoint مخصص بدون auth
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --quiet --tries=1 --output-document=- http://localhost:8080/api/healthz | grep -q '"ok"' || exit 1

ENTRYPOINT ["/app/noab-server"]
