# =====================================================
# Parliament Research Portal - All-in-One Container
# =====================================================
# تطبيق موحَّد (backend + frontend) في حاوية واحدة
# يستخدم supervisord لتشغيل Go backend + Nginx معاً
# مناسب لـ Coolify Dockerfile build pack
# =====================================================

# =====================================================
# Stage 1: Build Go backend
# =====================================================
FROM golang:1.25-alpine AS backend-builder
RUN apk add --no-cache gcc musl-dev
WORKDIR /build
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=1 GOOS=linux \
    go build -trimpath -ldflags='-s -w' -o /noab-server .

# =====================================================
# Stage 2: Build React frontend
# =====================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY deputy-portal/package.json deputy-portal/package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY deputy-portal/ ./
# نفس الـ origin → /api يُوجَّه إلى backend عبر nginx
ENV VITE_API_BASE=""
RUN npm run build

# =====================================================
# Stage 3: Runtime (Nginx + Go binary via supervisord)
# =====================================================
FROM nginx:1.27-alpine

# تثبيت المتطلبات
RUN apk add --no-cache supervisor ca-certificates tzdata sqlite-libs && \
    rm -f /etc/nginx/conf.d/default.conf

# نسخ Go binary
COPY --from=backend-builder /noab-server /app/noab-server

# نسخ ملفات الـ frontend المبنية
COPY --from=frontend-builder /build/dist /usr/share/nginx/html

# nginx.conf مخصص يخدم static + يوجِّه /api إلى localhost:8080
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json font/woff2 image/svg+xml;

    # توجيه /api إلى Go backend على localhost:8080
    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        client_max_body_size 11M;
    }

    location /assets/ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        access_log off;
    }

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;

        location = /index.html {
            add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        }
    }

    location ~ /\. { deny all; access_log off; log_not_found off; }
}
EOF

# تكوين supervisord لتشغيل nginx + noab-server معاً
COPY <<'EOF' /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root
logfile=/dev/null
logfile_maxbytes=0
pidfile=/tmp/supervisord.pid

[program:backend]
command=/app/noab-server
directory=/app
autostart=true
autorestart=true
priority=10
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
priority=20
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF

# مجلدات البيانات (mount points للـ volumes)
RUN mkdir -p /app/data /app/uploads && chmod 755 /app/data /app/uploads

ENV DB_PATH=/app/data/noab.db \
    PORT=8080 \
    GO_ENV=production

EXPOSE 80

# نشغّل supervisord الذي يدير العمليتين
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
