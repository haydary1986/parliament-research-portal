#!/bin/sh
# =====================================================
# نسخ احتياطي لمنصة البحوث البرلمانية
# =====================================================
# يُشغَّل على خادم Coolify عبر cron. ينسخ قاعدة البيانات والملفات
# المرفوعة من الـ volumes، ويحتفظ بآخر RETENTION_DAYS يوماً.
#
# التركيب (على الخادم، مرة واحدة):
#   install -m 755 backup.sh /usr/local/bin/parliament-backup
#   crontab -e  →  0 2 * * * /usr/local/bin/parliament-backup >> /var/log/parliament-backup.log 2>&1
#
# ⚠️ النسخ على القرص نفسه لا تحمي من عطل القرص. اضبط REMOTE_DEST
#    لنقلها خارج الخادم (rsync/rclone) وإلا بقيت نقطة فشل واحدة.
# =====================================================
set -eu

APP_UUID="${APP_UUID:-s14anw4d1zc53gvgc7oftptn}"
BACKUP_ROOT="${BACKUP_ROOT:-/root/backups/parliament}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
REMOTE_DEST="${REMOTE_DEST:-}"   # مثال: user@host:/backups/parliament

STAMP=$(date +%Y%m%d-%H%M%S)
WORK="$BACKUP_ROOT/tmp-$STAMP"
ARCHIVE="$BACKUP_ROOT/parliament-$STAMP.tar.gz"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

CONTAINER=$(docker ps -q --filter "name=$APP_UUID" | head -1)
if [ -z "$CONTAINER" ]; then
  log "❌ لم يُعثر على حاوية تعمل بالاسم $APP_UUID"
  exit 1
fi

mkdir -p "$WORK"
trap 'rm -rf "$WORK"' EXIT

log "نسخ قاعدة البيانات من الحاوية $CONTAINER"
# نسخ الملفات الثلاثة معاً: SQLite يسترجع الـ WAL عند أول فتح.
# نسخ noab.db وحده يفقد كل ما لم يُرحَّل بعد — وهو ما كان 1.5MB فعلياً.
for f in noab.db noab.db-wal noab.db-shm; do
  docker cp "$CONTAINER:/app/data/$f" "$WORK/$f" 2>/dev/null || log "⚠️  $f غير موجود (طبيعي إن كان الـ WAL فارغاً)"
done

log "نسخ الملفات المرفوعة"
docker cp "$CONTAINER:/app/uploads" "$WORK/uploads" 2>/dev/null || mkdir -p "$WORK/uploads"

tar czf "$ARCHIVE" -C "$WORK" .
SIZE=$(du -h "$ARCHIVE" | cut -f1)
log "✓ أُنشئت النسخة: $ARCHIVE ($SIZE)"

# فحص سلامة: نتحقق أن الأرشيف يُفتح ويحوي قاعدة البيانات
if ! tar tzf "$ARCHIVE" | grep -q "noab.db"; then
  log "❌ الأرشيف لا يحوي قاعدة البيانات — النسخة غير صالحة"
  rm -f "$ARCHIVE"
  exit 1
fi

if [ -n "$REMOTE_DEST" ]; then
  log "نقل النسخة خارج الخادم إلى $REMOTE_DEST"
  if rsync -az "$ARCHIVE" "$REMOTE_DEST/"; then
    log "✓ نُقلت خارج الخادم"
  else
    log "⚠️  فشل النقل الخارجي — النسخة المحلية سليمة"
  fi
fi

log "حذف النسخ الأقدم من $RETENTION_DAYS يوماً"
find "$BACKUP_ROOT" -maxdepth 1 -name 'parliament-*.tar.gz' -mtime "+$RETENTION_DAYS" -print -delete

COUNT=$(find "$BACKUP_ROOT" -maxdepth 1 -name 'parliament-*.tar.gz' | wc -l | tr -d ' ')
log "✓ اكتمل — $COUNT نسخة محفوظة"
