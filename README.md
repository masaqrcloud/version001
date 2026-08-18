# MasaQR

Cafe ve restoranlar için çok mekanlı QR masa sipariş platformu.

Aynı masada herkes kendi sepetinden sipariş verir; hesap masada toplanır.

## Çalıştırma

Node 20+ önerilir.

```bash
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Aç: [http://localhost:3000](http://localhost:3000)

## Demo

Şifre: `demo1234`

- Admin: `admin@demo.com` → `/admin`
- Garson: `garson@demo.com` → `/staff/waiter`
- Mutfak: `mutfak@demo.com` → `/staff/kitchen`
- Müşteri masaları: `/t/masa-1`, `/t/masa-2`, `/t/masa-3`

## Veritabanı

Yerelde SQLite (`prisma/dev.db`) kullanılır; Docker gerekmez.

Postgres için `docker-compose.yml` hazır. Ayağa kaldırdıktan sonra `prisma/schema.prisma` içinde `provider` değerini `postgresql` yap ve `.env` içindeki `DATABASE_URL` değerini şöyle değiştir:

```
postgresql://orderqr:orderqr@localhost:5433/orderqr
```
