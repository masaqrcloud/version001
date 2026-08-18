#!/bin/bash
set -e

echo "🚀 MasaQR güncelleniyor..."

# 1. En son kodları GitHub'dan çek
git pull origin main

# 2. Paketleri yükle
npm install

# 3. Prisma istemcisini oluştur
npx prisma generate

# 4. Next.js derlemesini yap
npm run build

# 5. Servisi yeniden başlat (Systemd veya PM2)
if systemctl is-active --quiet masaqr.service 2>/dev/null; then
    echo "🔄 systemd servisi (masaqr.service) yeniden başlatılıyor..."
    sudo systemctl restart masaqr.service
elif systemctl is-active --quiet masaqr 2>/dev/null; then
    echo "🔄 systemd servisi (masaqr) yeniden başlatılıyor..."
    sudo systemctl restart masaqr
elif systemctl is-active --quiet nextjs 2>/dev/null; then
    echo "🔄 systemd servisi (nextjs) yeniden başlatılıyor..."
    sudo systemctl restart nextjs
elif command -v pm2 &>/dev/null && pm2 list | grep -q "masaqr"; then
    echo "🔄 PM2 süreci (masaqr) yeniden başlatılıyor..."
    pm2 reload masaqr
else
    echo "🔄 Systemd servisini yeniden başlatmayı unutmayın: sudo systemctl restart <servis-adiniz>"
fi

echo "✅ MasaQR başarıyla derlendi ve masaqr.net üzerinde yayında!"
