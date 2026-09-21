/**
 * E-posta şablonlarını `mail-preview/` klasörüne HTML olarak yazar.
 * Kullanım: npx tsx scripts/mail-preview.ts
 *
 * Gün sonu ve haftalık rapor yerel veritabanındaki ilk mekânın gerçek
 * verisiyle, müşteri şablonları örnek veriyle çizilir.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { prisma } from "../src/lib/db";
import {
  buildDaySummaryMail,
  buildWeekSummaryMail,
} from "../src/lib/venue-summary-mail";
import {
  loyaltyRewardMailHtml,
  welcomeMailHtml,
} from "../src/lib/customer-mail";

async function main() {
  const dir = "mail-preview";
  await mkdir(dir, { recursive: true });

  const files: [string, string][] = [
    ["hosgeldin.html", welcomeMailHtml("Masa")],
    [
      "ikram.html",
      loyaltyRewardMailHtml({
        name: "Masa",
        venueName: "Kahve Durağı",
        itemName: "Filtre Kahve",
        available: 1,
      }),
    ],
  ];

  const venue = await prisma.venue.findFirst({ select: { id: true, name: true } });
  if (venue) {
    const day = await buildDaySummaryMail(venue.id);
    const week = await buildWeekSummaryMail(venue.id);
    if (day) files.push(["gun-sonu.html", day.html]);
    if (week) files.push(["haftalik.html", week.html]);
  }

  for (const [name, html] of files) {
    await writeFile(`${dir}/${name}`, html, "utf8");
    console.log(`${dir}/${name}`);
  }
  await prisma.$disconnect();
}

void main();
