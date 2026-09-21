import { sendTransactionalEmail } from "@/lib/mail";
import {
  escapeHtml,
  mailButton,
  mailCallout,
  mailDocument,
  mailLineTable,
  mailMoney as money,
  mailParagraph,
} from "@/lib/mail-ui";
import { signedGuestCookie } from "@/lib/guest";
import { tableLabel } from "@/lib/table-label";

type ReceiptLine = {
  name: string;
  quantity: number;
  price: number;
};

export function sendDigitalReceiptMail({
  email,
  venueName,
  tableNumber,
  lines,
  guestToken,
}: {
  email: string;
  venueName: string;
  tableNumber: string;
  lines: ReceiptLine[];
  guestToken: string;
}) {
  const total = lines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    "https://masaqr.net"
  ).replace(/\/$/, "");
  const feedbackUrl = `${baseUrl}/feedback/${encodeURIComponent(
    signedGuestCookie(guestToken),
  )}`;

  const content = [
    mailParagraph(
      `<strong>${escapeHtml(venueName)}</strong> · ${escapeHtml(tableLabel(tableNumber))}`,
    ),
    mailLineTable(
      lines.map((line) => ({
        label: `${line.quantity}× ${line.name}`,
        amount: money(line.price * line.quantity),
      })),
      { label: "Toplam", amount: money(total) },
    ),
    mailButton("Deneyimini değerlendir", feedbackUrl),
    mailCallout(
      "neutral",
      "Bu belge bilgilendirme amaçlı dijital adisyondur; mali fiş veya fatura yerine geçmez.",
    ),
  ].join("");

  return sendTransactionalEmail({
    to: email,
    subject: `${venueName} dijital adisyonun`,
    text: `${venueName}, ${tableLabel(tableNumber)}, toplam ${money(total)}`,
    html: mailDocument({
      title: "Dijital adisyonun",
      kicker: venueName,
      preheader: `Toplam ${money(total)} · ${lines.length} kalem`,
      content,
    }),
  });
}
