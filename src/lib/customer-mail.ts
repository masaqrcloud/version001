import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/mail";
import {
  escapeHtml,
  mailButton,
  mailCallout,
  mailDocument,
  mailFeatureList,
  mailHero,
  mailParagraph,
  mailPunchCard,
  mailSectionTitle,
} from "@/lib/mail-ui";
import { appUrl, mailOptOutToken } from "@/lib/customer";
import { LOYALTY_THRESHOLD } from "@/lib/loyalty";

function optOutFooter(customerId: string) {
  const url = `${appUrl()}/mail-tercihleri?t=${encodeURIComponent(mailOptOutToken(customerId))}`;
  return `Bu e-postaları almak istemiyorsan <a href="${escapeHtml(url)}" style="color:#756b62;text-decoration:underline">bildirimleri kapat</a>.`;
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

function loadCustomer(customerId: string) {
  return prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      email: true,
      name: true,
      mailOptOut: true,
      deletedAt: true,
    },
  });
}

export function welcomeMailHtml(name: string, footer?: string) {
  const content = [
    mailParagraph(`Merhaba ${escapeHtml(name)},`),
    mailParagraph(
      "MasaQR’a Google hesabınla giriş yaptın. Artık masada QR okuttuğunda seni tanıyacağız.",
    ),
    mailSectionTitle("Hesabınla neler yapabilirsin"),
    mailFeatureList([
      {
        title: "Sipariş geçmişin",
        text: "Hangi mekânda ne sipariş ettiğini evden de görebilirsin.",
      },
      {
        title: "Müdavim kartların",
        text: `Her mekânda kart otomatik dolar; ${LOYALTY_THRESHOLD} alışverişte ikramını kazanırsın.`,
      },
      {
        title: "Dijital adisyon",
        text: "Masa kapanınca hesabın e-postana gelir, kâğıt beklemezsin.",
      },
    ]),
    mailSectionTitle("Müdavim kartı böyle görünür"),
    mailPunchCard(0, LOYALTY_THRESHOLD),
    mailButton("Siparişlerime git", `${appUrl()}/hesabim`),
  ].join("");

  return mailDocument({
    title: "Üyeliğin hazır, teşekkürler",
    preheader: "Sipariş geçmişin ve müdavim kartların artık tek yerde.",
    content,
    footer,
  });
}

export function loyaltyRewardMailHtml({
  name,
  venueName,
  itemName,
  available,
  threshold = LOYALTY_THRESHOLD,
  footer,
}: {
  name: string;
  venueName: string;
  itemName: string;
  available: number;
  threshold?: number;
  footer?: string;
}) {
  const rights =
    available > 1 ? `${available} ikram hakkın` : "bir ikram hakkın";
  const content = [
    mailParagraph(`Merhaba ${escapeHtml(name)},`),
    mailParagraph(
      `<strong>${escapeHtml(venueName)}</strong> müdavim kartını doldurdun. Şu an ${escapeHtml(rights)} var.`,
    ),
    mailPunchCard(threshold, threshold),
    mailHero("Kazandığın ikram", itemName, `${venueName} · bedava`),
    mailCallout(
      "neutral",
      "Masada QR’ı okuttuğunda sepette <strong>“Müdavim haklarım”</strong> bölümünden ikramını ekleyebilirsin. Mutfak siparişi “İkram” olarak görür.",
    ),
    mailButton("Müdavim kartıma bak", `${appUrl()}/hesabim`),
  ].join("");

  return mailDocument({
    title: "İkramın hazır",
    kicker: venueName,
    preheader: `${itemName} ikramını bir sonraki siparişinde kullanabilirsin.`,
    content,
    footer,
  });
}

/**
 * Yeni üyeye tek seferlik hoş geldin e-postası. `welcomeMailAt` damgası önce
 * atılır, gönderim başarısızsa geri alınır; böylece çift gönderim olmaz.
 */
export async function sendCustomerWelcomeMail(customerId: string) {
  const customer = await loadCustomer(customerId);
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
      html: welcomeMailHtml(name, optOutFooter(customerId)),
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
  threshold = LOYALTY_THRESHOLD,
}: {
  customerId: string;
  venueName: string;
  itemName: string;
  available: number;
  threshold?: number;
}) {
  const customer = await loadCustomer(customerId);
  if (!canMail(customer)) return false;

  const name = greet(customer!);

  return sendTransactionalEmail({
    to: customer!.email,
    subject: `${venueName}’de ikramın hazır: ${itemName}`,
    text: `Merhaba ${name}, ${venueName} müdavim kartını doldurdun. ${itemName} ikramını bir sonraki siparişinde sepetten kullanabilirsin.`,
    html: loyaltyRewardMailHtml({
      name,
      venueName,
      itemName,
      available,
      threshold,
      footer: optOutFooter(customerId),
    }),
  });
}

/**
 * Kart dolmaya yaklaşan müşteriye hatırlatma (ör. 8/10). Tek başına cron ile
 * değil, ikram e-postasıyla aynı akışta kullanılmak üzere hazır tutuluyor.
 */
export async function sendLoyaltyProgressMail({
  customerId,
  venueName,
  itemName,
  filled,
  threshold = LOYALTY_THRESHOLD,
}: {
  customerId: string;
  venueName: string;
  itemName: string;
  filled: number;
  threshold?: number;
}) {
  const customer = await loadCustomer(customerId);
  if (!canMail(customer)) return false;

  const name = greet(customer!);
  const remaining = Math.max(1, threshold - filled);
  const content = [
    mailParagraph(`Merhaba ${escapeHtml(name)},`),
    mailParagraph(
      `<strong>${escapeHtml(venueName)}</strong> müdavim kartında ikramına <strong>${remaining} sipariş</strong> kaldı.`,
    ),
    mailPunchCard(filled, threshold),
    mailCallout(
      "accent",
      `Kart dolduğunda <strong>${escapeHtml(itemName)}</strong> ikramın olacak.`,
    ),
    mailButton("Kartıma bak", `${appUrl()}/hesabim`),
  ].join("");

  return sendTransactionalEmail({
    to: customer!.email,
    subject: `${venueName}: ikramına ${remaining} sipariş kaldı`,
    text: `${venueName} müdavim kartında ${filled}/${threshold} damga var. ${remaining} sipariş sonra ${itemName} ikramın olacak.`,
    html: mailDocument({
      title: "Kartın dolmak üzere",
      kicker: venueName,
      preheader: `${filled}/${threshold} damga tamamlandı.`,
      content,
      footer: optOutFooter(customerId),
    }),
  });
}
