import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { sendTransactionalEmail } from "@/lib/mail";
import {
  buildDaySummaryMail,
  buildWeekSummaryMail,
} from "@/lib/venue-summary-mail";
import { loyaltyRewardMailHtml, welcomeMailHtml } from "@/lib/customer-mail";

function html(body: string) {
  return new Response(body, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * Şablonların tarayıcıda görünen hâli; gönderim yapmaz.
 * `?type=gun|hafta|hosgeldin|ikram` ile şablon seçilir.
 */
export async function GET(request: Request) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const type = new URL(request.url).searchParams.get("type") ?? "gun";

  if (type === "hosgeldin") {
    return html(welcomeMailHtml("Misafir"));
  }

  const venue = await prisma.venue.findUnique({
    where: { id: user.venueId },
    select: { name: true, loyaltyItem: { select: { name: true } } },
  });
  if (!venue) {
    return NextResponse.json({ error: "Mekân bulunamadı" }, { status: 404 });
  }

  if (type === "ikram") {
    return html(
      loyaltyRewardMailHtml({
        name: "Misafir",
        venueName: venue.name,
        itemName: venue.loyaltyItem?.name ?? "İkram ürünü seçilmedi",
        available: 1,
      }),
    );
  }

  const mail =
    type === "hafta"
      ? await buildWeekSummaryMail(user.venueId)
      : await buildDaySummaryMail(user.venueId);
  if (!mail) {
    return NextResponse.json({ error: "Mekân bulunamadı" }, { status: 404 });
  }
  return html(mail.html);
}

/** Raporu gerçek alıcı listesine (OWNER/ADMIN + ek adres) test olarak yollar. */
export async function POST() {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const venue = await prisma.venue.findUnique({
    where: { id: user.venueId },
    select: { reportEmail: true, reportMail: true },
  });
  if (!venue) {
    return NextResponse.json({ error: "Mekân bulunamadı" }, { status: 404 });
  }

  const staff = await prisma.user.findMany({
    where: { venueId: user.venueId, role: { in: ["OWNER", "ADMIN"] } },
    select: { email: true },
  });
  const recipients = new Set<string>();
  for (const member of staff) {
    if (member.email?.trim()) recipients.add(member.email.trim());
  }
  if (user.email?.trim()) recipients.add(user.email.trim());
  if (venue.reportEmail?.trim()) recipients.add(venue.reportEmail.trim());

  const emails = [...recipients];
  if (!emails.length) {
    return NextResponse.json(
      { error: "Gönderilecek e-posta adresi yok" },
      { status: 400 },
    );
  }

  const mail = await buildDaySummaryMail(user.venueId);
  if (!mail) {
    return NextResponse.json({ error: "Mekân bulunamadı" }, { status: 404 });
  }

  const stamp = new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Istanbul",
  });
  const subject = `[Test ${stamp}] ${mail.subject}`;

  try {
    const delivered: string[] = [];
    const failed: string[] = [];
    for (const to of emails) {
      try {
        const sent = await sendTransactionalEmail({
          to,
          subject,
          text: mail.text,
          html: mail.html,
        });
        if (sent) delivered.push(to);
        else failed.push(to);
      } catch (sendError) {
        console.error(`Test raporu gönderilemedi: ${to}`, sendError);
        failed.push(to);
      }
    }

    if (!delivered.length) {
      return NextResponse.json(
        {
          error:
            failed.length
              ? "E-posta gönderilemedi. Resend API key ve domain ayarını kontrol et."
              : "E-posta servisi kapalı (RESEND_API_KEY tanımlı değil)",
        },
        { status: failed.length ? 502 : 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      to: delivered,
      failed,
      reportMailEnabled: venue.reportMail,
    });
  } catch (sendError) {
    console.error("Test raporu gönderilemedi", sendError);
    return NextResponse.json(
      { error: "E-posta gönderilemedi. Resend ayarlarını kontrol et." },
      { status: 502 },
    );
  }
}
