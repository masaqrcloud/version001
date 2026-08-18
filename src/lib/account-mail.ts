import {
  brandedEmail,
  escapeHtml,
  sendTransactionalEmail,
} from "@/lib/mail";

function actionButton(label: string, href: string) {
  return `<p style="margin:28px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#201a15;color:#fff;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:600">${label}</a></p>`;
}

export function sendPasswordResetMail(
  email: string,
  name: string,
  resetUrl: string,
) {
  return sendTransactionalEmail({
    to: email,
    subject: "MasaQR şifreni yenile",
    text: `Merhaba ${name}, şifreni yenilemek için bu bağlantıyı kullan: ${resetUrl}`,
    html: brandedEmail(
      "Şifreni yenile",
      `<p>Merhaba ${escapeHtml(name)},</p>
       <p>MasaQR hesabın için şifre yenileme talebi aldık. Bağlantı 60 dakika geçerlidir.</p>
       ${actionButton("Yeni şifre oluştur", resetUrl)}
       <p style="color:#756b62;font-size:13px">Bu talebi sen yapmadıysan bu e-postayı görmezden gelebilirsin.</p>`,
    ),
  });
}

export function sendApplicationApprovedMail(
  email: string,
  name: string,
  venueName: string,
  setupUrl: string,
) {
  return sendTransactionalEmail({
    to: email,
    subject: `MasaQR başvurun onaylandı: ${venueName}`,
    text: `Tebrikler ${name}. ${venueName} başvurun onaylandı. Hesabını oluştur: ${setupUrl}`,
    html: brandedEmail(
      "MasaQR’a hoş geldin",
      `<p>Merhaba ${escapeHtml(name)},</p>
       <p><strong>${escapeHtml(venueName)}</strong> için yaptığın başvuruyu onayladık.</p>
       <p>Aşağıdaki bağlantıdan güvenli şifreni belirleyip yönetim paneline giriş yapabilirsin.</p>
       ${actionButton("Hesabımı oluştur", setupUrl)}
       <p style="color:#756b62;font-size:13px">Bağlantı 60 dakika geçerlidir.</p>`,
    ),
  });
}

export function sendApplicationRejectedMail(
  email: string,
  name: string,
  venueName: string,
) {
  return sendTransactionalEmail({
    to: email,
    subject: `MasaQR başvurun hakkında: ${venueName}`,
    text: `Merhaba ${name}. ${venueName} için yaptığın başvuruyu şu aşamada onaylayamıyoruz.`,
    html: brandedEmail(
      "Başvurun hakkında",
      `<p>Merhaba ${escapeHtml(name)},</p>
       <p><strong>${escapeHtml(venueName)}</strong> için yaptığın başvuruyu değerlendirdik.</p>
       <p>Şu aşamada başvurunu onaylayamıyoruz. Koşulların değiştiğinde yeniden başvurabilirsin.</p>
       <p>İlgin için teşekkür ederiz.</p>`,
    ),
  });
}
