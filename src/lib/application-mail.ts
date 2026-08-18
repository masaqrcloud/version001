import {
  brandedEmail,
  escapeHtml,
  sendTransactionalEmail,
} from "@/lib/mail";

type ApplicationMail = {
  fullName: string;
  email: string;
  venueName: string;
  phone?: string | null;
  city?: string | null;
  venueType?: string | null;
  message?: string | null;
};

export async function sendApplicationMail(application: ApplicationMail) {
  const recipient =
    process.env.APPLICATION_NOTIFICATION_EMAIL ?? "masaqr.cloud@gmail.com";
  const details = [
    `<p><strong>Ad soyad:</strong> ${escapeHtml(application.fullName)}</p>`,
    `<p><strong>E-posta:</strong> ${escapeHtml(application.email)}</p>`,
    `<p><strong>Telefon:</strong> ${escapeHtml(application.phone ?? "-")}</p>`,
    `<p><strong>Mekân:</strong> ${escapeHtml(application.venueName)}</p>`,
    `<p><strong>Şehir:</strong> ${escapeHtml(application.city ?? "-")}</p>`,
    `<p><strong>Tür:</strong> ${escapeHtml(application.venueType ?? "-")}</p>`,
    application.message
      ? `<p><strong>Not:</strong><br>${escapeHtml(application.message)}</p>`
      : "",
  ].join("");

  return sendTransactionalEmail({
    to: recipient,
    replyTo: application.email,
    subject: `Yeni başvuru: ${application.venueName}`,
    text: `Yeni MasaQR başvurusu: ${application.fullName}, ${application.email}, ${application.venueName}`,
    html: brandedEmail("Yeni mekân başvurusu", details),
  });
}
