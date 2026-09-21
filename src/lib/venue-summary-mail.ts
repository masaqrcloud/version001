import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/mail";
import {
  MAIL_COLORS,
  mailBarChart,
  mailCallout,
  mailColumnChart,
  mailDocument,
  mailKpiGrid,
  mailLineTable,
  mailMoney as money,
  mailButton,
  mailParagraph,
  mailSectionTitle,
  escapeHtml,
} from "@/lib/mail-ui";
import { appUrl } from "@/lib/customer";
import {
  venueDayFeedback,
  venueLowStock,
  venueRevenueTrend,
  venueSummary,
} from "@/lib/venue-summary";

function minutes(value: number | null) {
  return value === null ? "—" : `${Math.round(value)} dk`;
}

function shortMoney(value: number) {
  if (value >= 1000) return `${Math.round(value / 1000)}b`;
  return String(Math.round(value));
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function dayLabel(day: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: "Europe/Istanbul",
  }).format(new Date(`${day}T12:00:00+03:00`));
}

async function recipientsFor(venueId: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { name: true, reportEmail: true, reportMail: true },
  });
  if (!venue || !venue.reportMail) return { venue, emails: [] as string[] };

  const staff = await prisma.user.findMany({
    where: { venueId, role: { in: ["OWNER", "ADMIN"] } },
    select: { email: true },
  });
  const emails = new Set<string>();
  if (venue.reportEmail?.trim()) emails.add(venue.reportEmail.trim());
  for (const member of staff) emails.add(member.email);
  return { venue, emails: [...emails] };
}

/**
 * Gün sonu raporu: KPI kartları, 7 günlük ciro grafiği, en çok satanlar,
 * misafir puanı, düşük stok ve hâlâ açık masalar.
 */
export async function buildDaySummaryMail(venueId: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { name: true },
  });
  if (!venue) return null;

  const summary = await venueSummary(venueId, 1);
  const [trend, lowStock, feedback] = await Promise.all([
    venueRevenueTrend(venueId, 7),
    venueLowStock(venueId),
    venueDayFeedback(venueId),
  ]);

  const yesterday = trend.length > 1 ? trend[trend.length - 2].total : 0;
  const revenueDelta = percentChange(summary.paidTotal, yesterday);
  const averageBasket =
    summary.closedCount > 0 ? summary.paidTotal / summary.closedCount : 0;

  const content = [
    mailParagraph(
      `<strong>${escapeHtml(venue.name)}</strong> · ${escapeHtml(dayLabel(summary.day))}`,
    ),
    mailKpiGrid([
      { label: "Kasada ciro", value: money(summary.paidTotal), delta: revenueDelta },
      { label: "Kapanan masa", value: String(summary.closedCount) },
      { label: "Masa başı ortalama", value: money(averageBasket) },
      { label: "Sipariş", value: `${summary.orderCount} adet` },
      { label: "Ortalama hazırlama", value: minutes(summary.averagePreparationMinutes) },
      { label: "Ortalama masa süresi", value: minutes(summary.averageTableMinutes) },
    ]),
    mailSectionTitle("Son 7 gün cirosu"),
    mailColumnChart(
      trend.map((point) => ({
        label: point.label,
        value: point.total,
        display: point.total > 0 ? shortMoney(point.total) : "",
      })),
      { highlightLast: true },
    ),
    summary.topItems.length
      ? mailSectionTitle("Bugün en çok satanlar") +
        mailBarChart(
          summary.topItems.slice(0, 5).map((item) => ({
            label: item.name,
            value: item.quantity,
            display: `${item.quantity} adet · ${money(item.total)}`,
          })),
        )
      : "",
    summary.averageRating !== null
      ? mailCallout(
          summary.averageRating >= 4 ? "ok" : "warn",
          `Misafir puanı <strong>${summary.averageRating.toFixed(1)} / 5</strong> · ${summary.feedbackCount} değerlendirme`,
        )
      : "",
    feedback.filter((item) => item.rating <= 3).length
      ? mailSectionTitle("Dikkat isteyen yorumlar") +
        feedback
          .filter((item) => item.rating <= 3)
          .map((item) =>
            mailCallout(
              "bad",
              `<strong>${item.rating}/5</strong>${item.comment ? ` — ${escapeHtml(item.comment)}` : ""}`,
            ),
          )
          .join("")
      : "",
    summary.cancellationCount > 0
      ? mailCallout(
          "warn",
          `${summary.cancellationCount} sipariş iptal edildi (%${Math.round(summary.cancellationRate * 100)}). En sık neden: ${escapeHtml(summary.cancellationReasons[0]?.reason ?? "—")}`,
        )
      : "",
    lowStock.length
      ? mailSectionTitle("Stoğu azalanlar") +
        mailLineTable(
          lowStock.map((item) => ({
            label: item.name,
            amount:
              item.stockQuantity <= 0
                ? "Tükendi"
                : `${item.stockQuantity} adet kaldı`,
          })),
        )
      : "",
    summary.openCount > 0
      ? mailCallout(
          "neutral",
          `Hâlâ <strong>${summary.openCount} masa açık</strong>, üzerinde ${money(summary.openTotal)} hesap var.`,
        )
      : "",
    mailButton("Panelde detaylara bak", `${appUrl()}/staff/summary`),
  ].join("");

  const html = mailDocument({
    title: "Gün sonu özeti",
    kicker: venue.name,
    preheader: `Ciro ${money(summary.paidTotal)} · ${summary.closedCount} masa · ${summary.orderCount} sipariş`,
    content,
    footer:
      "Bu rapor her akşam otomatik gönderilir. Alıcıyı değiştirmek veya kapatmak için Panel → Ayarlar → Raporlar.",
  });

  const text = [
    `${venue.name} · ${summary.day}`,
    `Kasada ciro: ${money(summary.paidTotal)}`,
    `Kapanan masa: ${summary.closedCount}`,
    `Sipariş: ${summary.orderCount} (${summary.itemCount} ürün)`,
    `Ortalama hazırlama: ${minutes(summary.averagePreparationMinutes)}`,
    summary.averageRating !== null
      ? `Misafir puanı: ${summary.averageRating.toFixed(1)}/5`
      : "",
    lowStock.length ? `Stoğu azalan ürün: ${lowStock.length}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `${venue.name} gün sonu: ${money(summary.paidTotal)}`,
    html,
    text,
    summary,
  };
}

export async function sendVenueDaySummaryMail(venueId: string) {
  const { venue, emails } = await recipientsFor(venueId);
  if (!venue) return { sent: 0, skipped: "venue" as const };
  if (!emails.length) return { sent: 0, skipped: "nobody" as const };

  const mail = await buildDaySummaryMail(venueId);
  if (!mail) return { sent: 0, skipped: "venue" as const };
  if (mail.summary.orderCount === 0 && mail.summary.closedCount === 0) {
    return { sent: 0, skipped: "idle" as const };
  }

  let sent = 0;
  for (const email of emails) {
    const ok = await sendTransactionalEmail({
      to: email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    if (ok) sent += 1;
  }
  return { sent, skipped: null };
}

/**
 * Haftalık rapor: 7 günün toplamı, günlük dağılım ve haftanın yıldızları.
 * Pazartesi sabahı gönderilir.
 */
export async function buildWeekSummaryMail(venueId: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { name: true },
  });
  if (!venue) return null;

  const summary = await venueSummary(venueId, 7);
  const trend = await venueRevenueTrend(venueId, 7);
  const best = [...trend].sort((a, b) => b.total - a.total)[0];
  const averageBasket =
    summary.closedCount > 0 ? summary.paidTotal / summary.closedCount : 0;

  const content = [
    mailParagraph(
      `<strong>${escapeHtml(venue.name)}</strong> · son 7 günün özeti`,
    ),
    mailKpiGrid([
      { label: "Haftalık ciro", value: money(summary.paidTotal) },
      { label: "Kapanan masa", value: String(summary.closedCount) },
      { label: "Masa başı ortalama", value: money(averageBasket) },
      { label: "Sipariş", value: `${summary.orderCount} adet` },
      { label: "Ortalama hazırlama", value: minutes(summary.averagePreparationMinutes) },
      { label: "Ortalama masa süresi", value: minutes(summary.averageTableMinutes) },
    ]),
    mailSectionTitle("Günlük dağılım"),
    mailColumnChart(
      trend.map((point) => ({
        label: point.label,
        value: point.total,
        display: point.total > 0 ? shortMoney(point.total) : "",
      })),
      { color: MAIL_COLORS.gold },
    ),
    best && best.total > 0
      ? mailCallout(
          "ok",
          `En iyi gün <strong>${escapeHtml(best.label)}</strong> · ${money(best.total)} · ${best.sessions} masa`,
        )
      : "",
    summary.topItems.length
      ? mailSectionTitle("Haftanın yıldızları") +
        mailBarChart(
          summary.topItems.slice(0, 8).map((item) => ({
            label: item.name,
            value: item.quantity,
            display: `${item.quantity} adet · ${money(item.total)}`,
          })),
        )
      : "",
    summary.averageRating !== null
      ? mailCallout(
          summary.averageRating >= 4 ? "ok" : "warn",
          `Misafir puanı <strong>${summary.averageRating.toFixed(1)} / 5</strong> · ${summary.feedbackCount} değerlendirme`,
        )
      : "",
    mailButton("Haftalık raporu aç", `${appUrl()}/staff/summary`),
  ].join("");

  const html = mailDocument({
    title: "Haftalık rapor",
    kicker: venue.name,
    preheader: `7 günde ${money(summary.paidTotal)} ciro · ${summary.closedCount} masa`,
    content,
    footer:
      "Bu rapor her pazartesi otomatik gönderilir. Alıcıyı değiştirmek veya kapatmak için Panel → Ayarlar → Raporlar.",
  });

  return {
    subject: `${venue.name} haftalık rapor: ${money(summary.paidTotal)}`,
    html,
    text: `${venue.name} son 7 gün: ${money(summary.paidTotal)} ciro, ${summary.closedCount} masa, ${summary.orderCount} sipariş.`,
    summary,
  };
}

export async function sendVenueWeekSummaryMail(venueId: string) {
  const { venue, emails } = await recipientsFor(venueId);
  if (!venue) return { sent: 0, skipped: "venue" as const };
  if (!emails.length) return { sent: 0, skipped: "nobody" as const };

  const mail = await buildWeekSummaryMail(venueId);
  if (!mail) return { sent: 0, skipped: "venue" as const };
  if (mail.summary.orderCount === 0 && mail.summary.closedCount === 0) {
    return { sent: 0, skipped: "idle" as const };
  }

  let sent = 0;
  for (const email of emails) {
    const ok = await sendTransactionalEmail({
      to: email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    if (ok) sent += 1;
  }
  return { sent, skipped: null };
}

async function forEveryVenue(
  send: (venueId: string) => Promise<{ sent: number; skipped: string | null }>,
) {
  const venues = await prisma.venue.findMany({ select: { id: true, name: true } });
  const results: { venue: string; sent: number; skipped: string | null }[] = [];
  for (const venue of venues) {
    try {
      const result = await send(venue.id);
      results.push({ venue: venue.name, ...result });
    } catch (error) {
      console.error(`Rapor gönderilemedi: ${venue.name}`, error);
      results.push({ venue: venue.name, sent: 0, skipped: "error" });
    }
  }
  return results;
}

export function sendAllVenueDaySummaryMails() {
  return forEveryVenue(sendVenueDaySummaryMail);
}

export function sendAllVenueWeekSummaryMails() {
  return forEveryVenue(sendVenueWeekSummaryMail);
}
