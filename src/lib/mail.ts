import { brandedEmail, escapeHtml } from "@/lib/mail-ui";

type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

// Şablon yardımcıları mail-ui içinde; buradan yeniden dışa açılıyor ki
// mevcut çağrılar (adisyon, rezervasyon, başvuru, şifre) değişmeden çalışsın.
export { brandedEmail, escapeHtml };

export async function sendTransactionalEmail(message: MailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY tanımlı değil; e-posta atlandı.");
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:
        process.env.APPLICATION_FROM_EMAIL ??
        "MasaQR <onboarding@resend.dev>",
      to: [message.to],
      reply_to: message.replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend e-postayı reddetti (${response.status}): ${detail}`);
  }

  return true;
}
