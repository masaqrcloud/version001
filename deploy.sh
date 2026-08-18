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

# 5. PM2 ile uygulamayı kesintisiz yenile
if pm2 list | grep -q "masaqr"; then
    pm2 reload masaqr
else
    pm2 start npm --name "masaqr" -- start
fi

echo "✅ MasaQR başarıyla güncellendi ve masaqr.net üzerinde yayında!"
