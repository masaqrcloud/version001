#!/bin/bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/masaqr}"
APP_ORIGIN="${APP_ORIGIN:-http://127.0.0.1:3000}"

if [ -z "${CRON_SECRET:-}" ] && [ -f "${APP_DIR}/.env" ]; then
  CRON_SECRET="$(sed -n 's/^CRON_SECRET=//p' "${APP_DIR}/.env" | tail -n1 | tr -d '"\r')"
fi

if [ -z "${CRON_SECRET:-}" ]; then
  echo "CRON_SECRET tanimli degil; gun sonu ozeti atlandi."
  exit 0
fi

curl -fsS -X POST "${APP_ORIGIN}/api/cron/day-summary" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Length: 0"

echo
echo "Gun sonu ozeti tetiklendi."
