import { brandedEmail, escapeHtml, sendTransactionalEmail } from "@/lib/mail";
import { signedGuestCookie } from "@/lib/guest";

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
  const rows = lines
    .map(
      (line) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #ead9ca">${line.quantity}× ${escapeHtml(line.name)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #ead9ca;text-align:right">${(line.price * line.quantity).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}</td>
        </tr>`,
    )
    .join("");
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    "https://masaqr.net"
  ).replace(/\/$/, "");
  const feedbackUrl = `${baseUrl}/feedback/${encodeURIComponent(
    signedGuestCookie(guestToken),
  )}`;

  return sendTransactionalEmail({
    to: email,
    subject: `${venueName} dijital adisyonun`,
    text: `${venueName}, Masa ${tableNumber}, toplam ${total.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}`,
    html: brandedEmail(
      "Dijital adisyonun",
      `<p><strong>${escapeHtml(venueName)}</strong> · Masa ${escapeHtml(tableNumber)}</p>
       <table style="width:100%;border-collapse:collapse">${rows}</table>
       <p style="font-size:20px;text-align:right"><strong>Toplam: ${total.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}</strong></p>
       <p style="text-align:center;margin:24px 0"><a href="${feedbackUrl}" style="display:inline-block;background:#e54b32;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600">Deneyimini değerlendir</a></p>
       <p style="color:#756b62;font-size:12px">Bu belge bilgilendirme amaçlı dijital adisyondur; mali fiş veya fatura yerine geçmez.</p>`,
    ),
  });
}
