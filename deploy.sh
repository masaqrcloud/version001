#!/bin/bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/masaqr}"
cd "$APP_DIR"

echo "MasaQR güncelleniyor..."

git fetch origin main
git reset --hard origin/main

rm -rf node_modules
npm install
npx prisma generate
npx prisma migrate deploy
npm run build

mkdir -p public/uploads/menu public/uploads/venues

if [ -f "$APP_DIR/deploy/nextapp.service" ]; then
  sudo cp "$APP_DIR/deploy/nextapp.service" /etc/systemd/system/nextapp.service
  sudo systemctl daemon-reload
  sudo systemctl enable nextapp
  sudo systemctl restart nextapp
  sudo systemctl is-active --quiet nextapp
else
  if command -v pm2 >/dev/null 2>&1; then
    if pm2 describe masaqr >/dev/null 2>&1; then
      pm2 reload ecosystem.config.cjs --update-env
    else
      pm2 start ecosystem.config.cjs
    fi
    pm2 save
  fi
fi

echo "MasaQR yayında: https://masaqr.net"
