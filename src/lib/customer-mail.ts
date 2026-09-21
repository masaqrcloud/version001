import { prisma } from "@/lib/db";
import { brandedEmail, escapeHtml, sendTransactionalEmail } from "@/lib/mail";
import { appUrl, mailOptOutToken } from "@/lib/customer";
import { LOYALTY_THRESHOLD } from "@/lib/loyalty";

function actionButton(label: string, href: string) {
  return `<p style="margin:28px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#201a15;color:#fff;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:600">${escapeHtml(label)}</a></p>`;
}

function optOutFooter(customerId: string) {
  const url = `${appUrl()}/mail-tercihleri?t=${encodeURIComponent(mailOptOutToken(customerId))}`;
  return `<p style="margin-top:28px;color:#756b62;font-size:12px">Bu e-postaları almak istemiyorsan <a href="${escapeHtml(url)}" style="color:#756b62">bildirimleri kapat</a>.</p>`;
}

type Recipient = {
  id: string;
  email: string;
  name: string | null;
  mailOptOut: boolean;
  deletedAt: Date | null;
};

function canMail(customer: Recipient | null) {
  if (!customer || customer.deletedAt || customer.mailOptOut) return false;
  return /.+@.+\..+/.test(customer.email);
}

function greet(customer: Recipient) {
  return customer.name?.trim() || customer.email.split("@")[0] || "Misafir";
}

/**
 * Yeni üyeye tek seferlik hoş geldin e-postası. `welcomeMailAt` damgası önce
 * atılır, gönderim başarısızsa geri alınır; böylece çift gönderim olmaz.
 */
export async function sendCustomerWelcomeMail(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      email: true,
      name: true,
      mailOptOut: true,
      deletedAt: true,
    },
  });
  if (!canMail(customer)) return false;

  const claimed = await prisma.customer.updateMany({
    where: { id: customerId, welcomeMailAt: null },
    data: { welcomeMailAt: new Date() },
  });
  if (claimed.count !== 1) return false;

  const name = greet(customer!);
  const accountUrl = `${appUrl()}/hesabim`;
  try {
    const sent = await sendTransactionalEmail({
      to: customer!.email,
      subject: "MasaQR’a hoş geldin",
      text: `Merhaba ${name}, MasaQR üyeliğin hazır. Sipariş geçmişin ve müdavim kartların: ${accountUrl}`,
      html: brandedEmail(
        "Üyeliğin hazır, teşekkürler",
        `<p>Merhaba ${escapeHtml(name)},</p>
         <p>MasaQR’a Google hesabınla giriş yaptın. Artık masada QR okuttuğunda seni tanıyacağız.</p>
         <ul style="padding-left:18px;color:#4a403a;line-height:1.8">
           <li><strong>Sipariş geçmişin</strong> tek ekranda, evden de görebilirsin.</li>
           <li><strong>Müdavim kartların</strong> otomatik dolar; ${LOYALTY_THRESHOLD} alışverişte ikramını kazanırsın.</li>
           <li><strong>Dijital adisyonun</strong> masa kapanınca e-postana gelir.</li>
         </ul>
         ${actionButton("Siparişlerime git", accountUrl)}
         ${optOutFooter(customerId)}`,
      ),
    });
    if (!sent) throw new Error("MAIL_SKIPPED");
    return true;
  } catch (error) {
    await prisma.customer.updateMany({
      where: { id: customerId },
      data: { welcomeMailAt: null },
    });
    if (error instanceof Error && error.message === "MAIL_SKIPPED") return false;
    throw error;
  }
}

export async function sendLoyaltyRewardMail({
  customerId,
  venueName,
  itemName,
  available,
}: {
  customerId: string;
  venueName: string;
  itemName: string;
  available: number;
}) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      email: true,
      name: true,
      mailOptOut: true,
      deletedAt: true,
    },
  });
  if (!canMail(customer)) return false;

  const name = greet(customer!);
  const accountUrl = `${appUrl()}/hesabim`;
  const rights =
    available > 1 ? `${available} ikram hakkın` : "bir ikram hakkın";

  return sendTransactionalEmail({
    to: customer!.email,
    subject: `${venueName}’de ikramın hazır: ${itemName}`,
    text: `Merhaba ${name}, ${venueName} müdavim kartını doldurdun. ${itemName} ikramını bir sonraki siparişinde sepetten kullanabilirsin.`,
    html: brandedEmail(
      "İkramın hazır",
      `<p>Merhaba ${escapeHtml(name)},</p>
       <p><strong>${escapeHtml(venueName)}</strong> müdavim kartını doldurdun. Şu an ${escapeHtml(rights)} var.</p>
       <p style="margin:22px 0;padding:18px;border-radius:16px;background:#fdece9;color:#b3261e;font-size:18px;font-weight:700;text-align:center">
         ${escapeHtml(itemName)} · ikram
       </p>
       <p>Masada QR’ı okuttuğunda sepette <strong>“Müdavim haklarım”</strong> bölümünden ikramını ekleyebilirsin. Mutfak siparişi “İkram” olarak görür.</p>
       ${actionButton("Müdavim kartıma bak", accountUrl)}
       ${optOutFooter(customerId)}`,
    ),
  });
}
