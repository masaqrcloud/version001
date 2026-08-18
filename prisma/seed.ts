import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();
  await prisma.venue.deleteMany();

  const venue = await prisma.venue.create({
    data: {
      name: "Kahve Durağı",
      slug: "kahve-duragi",
      logoUrl: null,
    },
  });

  const passwordHash = await bcrypt.hash("demo1234", 10);

  await prisma.user.create({
    data: {
      email: "owner@masaqr.com",
      passwordHash,
      name: "MasaQR",
      role: "PLATFORM",
    },
  });

  await prisma.user.createMany({
    data: [
      {
        email: "admin@demo.com",
        passwordHash,
        name: "Ayşe Yönetici",
        role: "OWNER",
        venueId: venue.id,
      },
      {
        email: "garson@demo.com",
        passwordHash,
        name: "Mehmet Garson",
        role: "WAITER",
        venueId: venue.id,
      },
      {
        email: "mutfak@demo.com",
        passwordHash,
        name: "Zeynep Mutfak",
        role: "KITCHEN",
        venueId: venue.id,
      },
    ],
  });

  await prisma.table.createMany({
    data: [
      { number: "1", qrToken: "masa-1", venueId: venue.id },
      { number: "2", qrToken: "masa-2", venueId: venue.id },
      { number: "3", qrToken: "masa-3", venueId: venue.id },
    ],
  });

  const kahveler = await prisma.menuCategory.create({
    data: { venueId: venue.id, name: "Kahveler", sortOrder: 1 },
  });
  const caylar = await prisma.menuCategory.create({
    data: { venueId: venue.id, name: "Çaylar", sortOrder: 2 },
  });
  const tatlilar = await prisma.menuCategory.create({
    data: { venueId: venue.id, name: "Tatlılar", sortOrder: 3 },
  });
  const atistirmalik = await prisma.menuCategory.create({
    data: { venueId: venue.id, name: "Atıştırmalık", sortOrder: 4 },
  });

  await prisma.menuItem.createMany({
    data: [
      {
        categoryId: kahveler.id,
        name: "Espresso",
        description: "Tek shot, yoğun ve kısa",
        price: 70,
        sortOrder: 1,
      },
      {
        categoryId: kahveler.id,
        name: "Americano",
        description: "Espresso ve sıcak su",
        price: 85,
        sortOrder: 2,
      },
      {
        categoryId: kahveler.id,
        name: "Latte",
        description: "Espresso, buharlanmış süt",
        price: 110,
        sortOrder: 3,
      },
      {
        categoryId: kahveler.id,
        name: "Cappuccino",
        description: "Eşit espresso, süt ve köpük",
        price: 110,
        sortOrder: 4,
      },
      {
        categoryId: kahveler.id,
        name: "Filtre Kahve",
        description: "Günün çekirdeği, 250 ml",
        price: 95,
        sortOrder: 5,
      },
      {
        categoryId: caylar.id,
        name: "Çay",
        description: "İnce belli bardak",
        price: 35,
        sortOrder: 1,
      },
      {
        categoryId: caylar.id,
        name: "Adaçayı",
        description: "Taze demleme",
        price: 55,
        sortOrder: 2,
      },
      {
        categoryId: caylar.id,
        name: "Ihlamur",
        description: "Ballı servis edilir",
        price: 55,
        sortOrder: 3,
      },
      {
        categoryId: tatlilar.id,
        name: "San Sebastian",
        description: "Karamelize cheesecake dilimi",
        price: 160,
        sortOrder: 1,
      },
      {
        categoryId: tatlilar.id,
        name: "Brownie",
        description: "Sıcak, vanilyalı dondurma ile",
        price: 145,
        sortOrder: 2,
      },
      {
        categoryId: tatlilar.id,
        name: "Cookie",
        description: "Çikolata parçacıklı",
        price: 75,
        sortOrder: 3,
      },
      {
        categoryId: atistirmalik.id,
        name: "Kruvasan",
        description: "Tereyağlı, fırından",
        price: 90,
        sortOrder: 1,
      },
      {
        categoryId: atistirmalik.id,
        name: "Tost",
        description: "Kaşarlı sourdough",
        price: 130,
        sortOrder: 2,
      },
      {
        categoryId: atistirmalik.id,
        name: "Granola Kase",
        description: "Yoğurt, mevsim meyvesi, bal",
        price: 150,
        sortOrder: 3,
      },
    ],
  });

  console.log("Seed tamam: Kahve Durağı");
  console.log("  owner@masaqr.com / demo1234  (uygulama sahibi)");
  console.log("  admin@demo.com / demo1234    (kafe yöneticisi)");
  console.log("  garson@demo.com / demo1234");
  console.log("  mutfak@demo.com / demo1234");
  console.log("  Masalar: /t/masa-1  /t/masa-2  /t/masa-3");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
