import { prisma } from "@/lib/db";
import { brandedEmail, escapeHtml, sendTransactionalEmail } from "@/lib/mail";
import { appUrl } from "@/lib/customer";
import { venueSummary, type VenueSummary } from "@/lib/venue-summary";

function money(value: number) {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

function minutes(value: number | null) {
  return value === null ? "—" : `${Math.round(value)} dk`;
}

function statCell(label: string, value: string) {
  return `
    <td style="padding:12px 14px;border:1px solid #ead9ca;border-radius:14px;background:#fffdf9">
      <p style="margin:0;color:#756b62;font-size:12px">${escapeHtml(label)}</p>
      <p style="margin:4px 0 0;font-size:19px;font-weight:700">${escapeHtml(value)}</p>
    </td>`;
}

function summaryHtml(venueName: string, summary: VenueSummary) {
  const topRows = summary.topItems
    .slice(0, 5)
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #ead9ca">${item.quantity}× ${escapeHtml(item.name)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #ead9ca;text-align:right">${money(item.total)}</td>
        </tr>`,
    )
    .join("");

  const cancelNote =
    summary.cancellationCount > 0
      ? `<p style="margin:16px 0 0;color:#b3261e;font-size:14px">${summary.cancellationCount} sipariş iptal edildi (%${Math.round(summary.cancellationRate * 100)}).</p>`
      : "";

  const ratingNote =
    summary.averageRating !== null
      ? `<p style="margin:8px 0 0;font-size:14px">Misafir puanı: <strong>${summary.averageRating.toFixed(1)}</strong> / 5 · ${summary.feedbackCount} değerlendirme</p>`
      : `<p style="margin:8px 0 0;color:#756b62;font-size:14px">Bugün değerlendirme gelmedi.</p>`;

  const openNote =
    summary.openCount > 0
      ? `<p style="margin:16px 0 0;color:#9a5b00;font-size:14px">Hâlâ ${summary.openCount} masa açık, üzerinde ${money(summary.openTotal)} hesap var.</p>`
      : "";

  return brandedEmail(
    "Gün sonu özeti",
    `<p style="margin:0 0 4px"><strong>${escapeHtml(venueName)}</strong> · ${escapeHtml(summary.day)}</p>
     <table style="width:100%;border-collapse:separate;border-spacing:8px 8px;margin-top:16px">
       <tr>${statCell("Kasada ciro", money(summary.paidTotal))}${statCell("Kapanan masa", String(summary.closedCount))}</tr>
       <tr>${statCell("Sipariş", `${summary.orderCount} adet`)}${statCell("Satılan ürün", `${summary.itemCount} adet`)}</tr>
       <tr>${statCell("Ortalama hazırlama", minutes(summary.averagePreparationMinutes))}${statCell("Ortalama masa süresi", minutes(summary.averageTableMinutes))}</tr>
     </table>
     ${
       topRows
         ? `<p style="margin:24px 0 6px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#756b62">En çok satanlar</p>
            <table style="width:100%;border-collapse:collapse">${topRows}</table>`
         : ""
     }
     ${ratingNote}
     ${cancelNote}
     ${openNote}
     <p style="margin:28px 0"><a href="${escapeHtml(`${appUrl()}/staff/summary`)}" style="display:inline-block;background:#201a15;color:#fff;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:600">Panelde detaylara bak</a></p>`,
  );
}

/**
 * Bir mekânın gün sonu özetini OWNER ve ADMIN kullanıcılarına gönderir.
 * Hareketsiz günlerde (sipariş yok, kapanan masa yok) gönderim yapılmaz.
 */
export async function sendVenueDaySummaryMail(venueId: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { id: true, name: true },
  });
  if (!venue) return { sent: 0, skipped: "venue" as const };

  const summary = await venueSummary(venue.id, 1);
  if (summary.orderCount === 0 && summary.closedCount === 0) {
    return { sent: 0, skipped: "idle" as const };
  }

  const recipients = await prisma.user.findMany({
    where: { venueId: venue.id, role: { in: ["OWNER", "ADMIN"] } },
    select: { email: true, name: true },
  });
  if (recipients.length === 0) return { sent: 0, skipped: "nobody" as const };

  const html = summaryHtml(venue.name, summary);
  const text = [
    `${venue.name} · ${summary.day}`,
    `Kasada ciro: ${money(summary.paidTotal)}`,
    `Kapanan masa: ${summary.closedCount}`,
    `Sipariş: ${summary.orderCount} (${summary.itemCount} ürün)`,
    `Ortalama hazırlama: ${minutes(summary.averagePreparationMinutes)}`,
  ].join("\n");

  let sent = 0;
  for (const recipient of recipients) {
    const ok = await sendTransactionalEmail({
      to: recipient.email,
      subject: `${venue.name} gün sonu: ${money(summary.paidTotal)}`,
      text,
      html,
    });
    if (ok) sent += 1;
  }
  return { sent, skipped: null };
}

export async function sendAllVenueDaySummaryMails() {
  const venues = await prisma.venue.findMany({ select: { id: true, name: true } });
  const results: { venue: string; sent: number; skipped: string | null }[] = [];
  for (const venue of venues) {
    try {
      const result = await sendVenueDaySummaryMail(venue.id);
      results.push({ venue: venue.name, ...result });
    } catch (error) {
      console.error(`Gün sonu özeti gönderilemedi: ${venue.name}`, error);
      results.push({ venue: venue.name, sent: 0, skipped: "error" });
    }
  }
  return results;
}
