#!/bin/bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/masaqr}"
cd "$APP_DIR"

echo "MasaQR güncelleniyor..."

git fetch origin main
git reset --hard origin/main

npm install
npx prisma generate
npx prisma migrate deploy
npm run build

mkdir -p public/uploads/menu public/uploads/venues

if pm2 describe masaqr >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save

echo "MasaQR yayında: https://masaqr.net"
