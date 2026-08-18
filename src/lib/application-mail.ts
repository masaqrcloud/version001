type ApplicationMail = {
  fullName: string;
  email: string;
  venueName: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendApplicationMail(application: ApplicationMail) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient =
    process.env.APPLICATION_NOTIFICATION_EMAIL ?? "masaqr.cloud@gmail.com";

  if (!apiKey) {
    console.warn("RESEND_API_KEY tanımlı değil; başvuru e-postası atlandı.");
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
        "MasaQR Başvuruları <onboarding@resend.dev>",
      to: [recipient],
      reply_to: application.email,
      subject: `Yeni başvuru: ${application.venueName}`,
      text: [
        "MasaQR'a yeni bir başvuru geldi.",
        "",
        `Ad soyad: ${application.fullName}`,
        `E-posta: ${application.email}`,
        `Mekân: ${application.venueName}`,
      ].join("\n"),
      html: `
        <h2>MasaQR'a yeni bir başvuru geldi</h2>
        <p><strong>Ad soyad:</strong> ${escapeHtml(application.fullName)}</p>
        <p><strong>E-posta:</strong> ${escapeHtml(application.email)}</p>
        <p><strong>Mekân:</strong> ${escapeHtml(application.venueName)}</p>
      `,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend e-postayı reddetti (${response.status}): ${detail}`);
  }

  return true;
}
