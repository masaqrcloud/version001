#!/bin/bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/masaqr}"
BACKUP_ROOT="${BACKUP_ROOT:-/home/ubuntu/masaqr-backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="${BACKUP_ROOT}/${STAMP}"
DB_PATH="${BACKUP_DATABASE_PATH:-${APP_DIR}/prisma/dev.db}"

mkdir -p "${DEST}"

python3 - "${DB_PATH}" "${DEST}/database.db" <<'PY'
import sqlite3
import sys

source_path, target_path = sys.argv[1], sys.argv[2]
source = sqlite3.connect(f"file:{source_path}?mode=ro", uri=True)
target = sqlite3.connect(target_path)
with target:
    source.backup(target)
result = target.execute("PRAGMA integrity_check").fetchone()
source.close()
target.close()
if not result or result[0] != "ok":
    raise SystemExit("SQLite backup integrity check failed")
PY

if [ -d "${APP_DIR}/public/uploads" ]; then
  tar -C "${APP_DIR}/public" -czf "${DEST}/uploads.tar.gz" uploads
fi

sha256sum "${DEST}/database.db" > "${DEST}/SHA256SUMS"
if [ -f "${DEST}/uploads.tar.gz" ]; then
  sha256sum "${DEST}/uploads.tar.gz" >> "${DEST}/SHA256SUMS"
fi

mapfile -t OLD_BACKUPS < <(
  ls -1dt "${BACKUP_ROOT}"/*/ 2>/dev/null | awk "NR>${KEEP_DAYS}"
)
if [ "${#OLD_BACKUPS[@]}" -gt 0 ]; then
  rm -rf -- "${OLD_BACKUPS[@]}"
fi

echo "MasaQR backup completed: ${DEST}"
df -h /
