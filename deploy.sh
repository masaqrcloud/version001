#!/bin/bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/masaqr}"
cd "$APP_DIR"

echo "MasaQR güncelleniyor..."

if ! swapon --show | grep -q .; then
  avail_kb="$(df -Pk / | awk 'NR==2 { print $4 }')"
  if [ "${avail_kb}" -gt 1200000 ]; then
    echo "512M swap ekleniyor..."
    sudo rm -f /swapfile
    sudo fallocate -l 512M /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    if ! grep -q '^/swapfile ' /etc/fstab; then
      echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
    fi
  else
    echo "Swap atlandı, disk dar: ${avail_kb} KB boş"
  fi
fi

git fetch origin main
git reset --hard origin/main

for candidate in \
  "$HOME/prisma/dev.db" \
  "$HOME/dev.db" \
  "$HOME/MasaQR/prisma/dev.db" \
  "$HOME/MasaQR/dev.db"
do
  if [ -f "$candidate" ]; then
    mkdir -p "$APP_DIR/prisma"
    if [ ! -f "$APP_DIR/prisma/dev.db" ] || [ "$(stat -c%s "$candidate")" -gt "$(stat -c%s "$APP_DIR/prisma/dev.db")" ]; then
      cp -a "$candidate" "$APP_DIR/prisma/dev.db"
      echo "Mevcut veritabanı kopyalandı: $candidate"
    fi
    break
  fi
done

npm install
npx prisma generate
npx prisma migrate deploy

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=768}"
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
