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

/** Aynı raporu giriş yapan kişinin adresine test olarak yollar. */
export async function POST() {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const to = user.email?.trim();
  if (!to) {
    return NextResponse.json(
      { error: "Hesabında kayıtlı e-posta yok" },
      { status: 400 },
    );
  }

  const mail = await buildDaySummaryMail(user.venueId);
  if (!mail) {
    return NextResponse.json({ error: "Mekân bulunamadı" }, { status: 404 });
  }

  try {
    const sent = await sendTransactionalEmail({
      to,
      subject: `[Test] ${mail.subject}`,
      text: mail.text,
      html: mail.html,
    });
    if (!sent) {
      return NextResponse.json(
        { error: "E-posta servisi kapalı (RESEND_API_KEY tanımlı değil)" },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, to });
  } catch (sendError) {
    console.error("Test raporu gönderilemedi", sendError);
    return NextResponse.json(
      { error: "E-posta gönderilemedi. Resend ayarlarını kontrol et." },
      { status: 502 },
    );
  }
}
