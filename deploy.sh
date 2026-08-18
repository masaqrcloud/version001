#!/bin/bash
set -e

echo "🚀 MasaQR güncelleniyor..."

# 1. En son kodları GitHub'dan çek
git pull origin main

# 2. Paketleri yükle
npm install

# 3. Prisma istemcisini oluştur
npx prisma generate

# 4. Veritabanı ve klasör izinlerini düzelt (SQLite yazma kilidini önler)
mkdir -p prisma public/uploads/menu public/uploads/venues
chmod -R 777 prisma public/uploads 2>/dev/null || true

# 5. Next.js derlemesini yap
npm run build

# 6. Servisi yeniden başlat (nextapp / systemd / PM2)
if systemctl is-active --quiet nextapp.service 2>/dev/null; then
    echo "🔄 systemd servisi (nextapp.service) yeniden başlatılıyor..."
    sudo systemctl restart nextapp.service
elif systemctl is-active --quiet nextapp 2>/dev/null; then
    echo "🔄 systemd servisi (nextapp) yeniden başlatılıyor..."
    sudo systemctl restart nextapp
elif systemctl is-active --quiet masaqr.service 2>/dev/null; then
    echo "🔄 systemd servisi (masaqr.service) yeniden başlatılıyor..."
    sudo systemctl restart masaqr.service
elif systemctl is-active --quiet masaqr 2>/dev/null; then
    echo "🔄 systemd servisi (masaqr) yeniden başlatılıyor..."
    sudo systemctl restart masaqr
elif command -v pm2 &>/dev/null && pm2 list | grep -q "masaqr"; then
    echo "🔄 PM2 süreci (masaqr) yeniden başlatılıyor..."
    pm2 reload masaqr
else
    echo "🔄 nextapp servisi yeniden başlatılıyor..."
    sudo systemctl restart nextapp || true
fi

echo "✅ MasaQR başarıyla derlendi ve masaqr.net üzerinde yayında!"
