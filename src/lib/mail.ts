type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function brandedEmail(title: string, content: string) {
  return `
    <div style="background:#f8f1e8;padding:32px 16px;font-family:Arial,sans-serif;color:#201a15">
      <div style="max-width:600px;margin:auto;background:#fffdf9;border:1px solid #ead9ca;border-radius:20px;overflow:hidden">
        <div style="height:8px;background:#e84a36"></div>
        <div style="padding:32px">
          <p style="margin:0 0 20px;color:#e84a36;font-size:13px;letter-spacing:2px;text-transform:uppercase">MasaQR</p>
          <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:30px">${title}</h1>
          ${content}
        </div>
      </div>
    </div>
  `;
}

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
