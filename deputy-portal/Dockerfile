# =========================================
# Stage 1: Builder (Node + Vite)
# =========================================
FROM node:20-alpine AS builder

WORKDIR /build

# نسخ ملفات الـ dependencies أولاً للاستفادة من Docker layer cache
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# نسخ بقية الكود
COPY . .

# VITE_API_BASE تأتي من build args
# الافتراضي "/" يعني: استخدم الـ host الحالي + /api (مفيد للـ reverse proxy)
ARG VITE_API_BASE=""
ENV VITE_API_BASE=$VITE_API_BASE

# Production build
RUN npm run build

# =========================================
# Stage 2: Runtime (nginx serving static + reverse proxy)
# =========================================
FROM nginx:1.27-alpine

# إزالة الـ default config لـ nginx
RUN rm -f /etc/nginx/conf.d/default.conf

# نسخ تكوين nginx الخاص بنا
COPY nginx.conf /etc/nginx/conf.d/default.conf

# نسخ المخرجات المبنية
COPY --from=builder /build/dist /usr/share/nginx/html

# إنشاء مستخدم non-root وتغيير الملكية
RUN addgroup -S app && adduser -S app -G app && \
    chown -R app:app /usr/share/nginx/html && \
    chown -R app:app /var/cache/nginx && \
    chown -R app:app /var/log/nginx && \
    chown -R app:app /etc/nginx && \
    touch /var/run/nginx.pid && \
    chown app:app /var/run/nginx.pid

USER app

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
