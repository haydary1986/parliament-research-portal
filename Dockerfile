# =====================================================
# Parliament Research Portal - All-in-One Container
# =====================================================
# تطبيق موحَّد (backend + frontend) في حاوية واحدة
# يستخدم shell script لتشغيل Go backend + Nginx معاً
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
ENV VITE_API_BASE=""
# حسابات الفحص على صفحة الدخول — اضبطه false عند التشغيل الرسمي
ARG VITE_SHOW_DEMO_ACCOUNTS=true
ENV VITE_SHOW_DEMO_ACCOUNTS=$VITE_SHOW_DEMO_ACCOUNTS
RUN npm run build

# =====================================================
# Stage 3: Runtime (Nginx + Go binary)
# =====================================================
FROM nginx:1.27-alpine

RUN apk add --no-cache ca-certificates tzdata sqlite-libs && \
    rm -f /etc/nginx/conf.d/default.conf

COPY --from=backend-builder /noab-server /app/noab-server
COPY --from=frontend-builder /build/dist /usr/share/nginx/html

# nginx config: static files + /api → 127.0.0.1:8080
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;

    # إخفاء إصدار nginx — كان يُكشف في جسم صفحات الخطأ (مثل 413)
    server_tokens off;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    # HSTS: الترويسات في Go تنطبق على /api فقط، فصفحات HTML كانت بلا حماية.
    # TLS ينتهي عند Traefik/Cloudflare، لذا نضيفها هنا لا خلف شرط $https.
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    # CSP: يسمح بخطوط Google التي تستخدمها صفحة الدخول فقط، ولا شيء غيرها.
    # 'unsafe-inline' للأنماط مطلوب لأن React يضع أنماطاً سطرية.
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;

    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/javascript application/json font/woff2 image/svg+xml;

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
    }

    location ~ /\. { deny all; access_log off; log_not_found off; }
}
EOF

# Entrypoint: shell script يشغّل العمليتين ويربط دورة حياتهما
COPY <<'EOF' /entrypoint.sh
#!/bin/sh
set -e

# دالة لإيقاف كل العمليات عند SIGTERM
shutdown() {
    echo "[entrypoint] shutting down..."
    [ -n "$BACKEND_PID" ] && kill -TERM "$BACKEND_PID" 2>/dev/null || true
    [ -n "$NGINX_PID" ] && kill -TERM "$NGINX_PID" 2>/dev/null || true
    wait
    exit 0
}
trap shutdown INT TERM

# 🔒 إجبار Go backend على port 8080 (Coolify قد يضع PORT=80 افتراضياً)
export PORT=8080

echo "[entrypoint] starting Go backend on :8080..."
/app/noab-server &
BACKEND_PID=$!

# انتظر backend ليبدأ ويستجيب
echo "[entrypoint] waiting for backend to respond..."
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    if wget -q -O - http://127.0.0.1:8080/api/healthz 2>/dev/null | grep -q ok; then
        echo "[entrypoint] ✓ backend ready"
        break
    fi
    [ "$i" = "15" ] && echo "[entrypoint] ⚠️  backend timeout but continuing"
    sleep 1
done

echo "[entrypoint] starting nginx on :80..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# انتظر أي عملية تموت ثم اخرج
wait -n
echo "[entrypoint] a process exited, shutting down container..."
shutdown
EOF
RUN chmod +x /entrypoint.sh

# مجلدات البيانات
RUN mkdir -p /app/data /app/uploads && chmod 755 /app/data /app/uploads

ENV DB_PATH=/app/data/noab.db \
    PORT=8080 \
    GO_ENV=production

EXPOSE 80

CMD ["/entrypoint.sh"]
