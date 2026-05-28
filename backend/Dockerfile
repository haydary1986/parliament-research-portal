# =========================================
# Stage 1: Builder
# =========================================
FROM golang:1.25-alpine AS builder

# gcc + musl-dev مطلوبان لـ CGO الذي يحتاجه go-sqlite3
RUN apk add --no-cache gcc musl-dev

WORKDIR /build

# تنزيل dependencies في طبقة منفصلة للاستفادة من cache
COPY go.mod go.sum ./
RUN go mod download

# نسخ الكود وبنائه
COPY . .

# البناء مع CGO_ENABLED=1 (مطلوب لـ go-sqlite3)
RUN CGO_ENABLED=1 GOOS=linux \
    go build -trimpath -ldflags='-s -w' \
    -o /noab-server .

# =========================================
# Stage 2: Runtime (minimal Alpine)
# =========================================
FROM alpine:3.20

# ca-certificates + tzdata + wget للـ healthcheck
RUN apk add --no-cache ca-certificates tzdata wget sqlite-libs

WORKDIR /app

# نسخ الباينري
COPY --from=builder /noab-server /app/noab-server

# إنشاء مجلدات البيانات والملفات المرفوعة
# سيتم mount عليها volumes خارجية من docker-compose
RUN mkdir -p /app/data /app/uploads && chmod 755 /app/data /app/uploads

# 🔒 عزل قاعدة البيانات والملفات
# DB_PATH يشير لداخل volume خارجي → البيانات تنجو من إعادة البناء
ENV DB_PATH=/app/data/noab.db \
    PORT=8080 \
    GO_ENV=production

EXPOSE 8080

ENTRYPOINT ["/app/noab-server"]
