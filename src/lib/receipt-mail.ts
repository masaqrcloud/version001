import { brandedEmail, escapeHtml, sendTransactionalEmail } from "@/lib/mail";

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
}: {
  email: string;
  venueName: string;
  tableNumber: string;
  lines: ReceiptLine[];
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

  return sendTransactionalEmail({
    to: email,
    subject: `${venueName} dijital adisyonun`,
    text: `${venueName}, Masa ${tableNumber}, toplam ${total.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}`,
    html: brandedEmail(
      "Dijital adisyonun",
      `<p><strong>${escapeHtml(venueName)}</strong> · Masa ${escapeHtml(tableNumber)}</p>
       <table style="width:100%;border-collapse:collapse">${rows}</table>
       <p style="font-size:20px;text-align:right"><strong>Toplam: ${total.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}</strong></p>
       <p style="color:#756b62;font-size:12px">Bu belge bilgilendirme amaçlı dijital adisyondur; mali fiş veya fatura yerine geçmez.</p>`,
    ),
  });
}
