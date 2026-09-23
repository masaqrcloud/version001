import {
  brandedEmail,
  escapeHtml,
  sendTransactionalEmail,
} from "@/lib/mail";
import { appUrl } from "@/lib/utils";
import { venueStaffEmails } from "@/lib/venue-mail-recipients";

type ReservationMail = {
  email: string;
  fullName: string;
  phone?: string | null;
  venueName: string;
  reservationDate: string;
  reservationTime: string;
  guestCount: number;
  note?: string | null;
  tableNumber?: string | null;
  rejectReason?: string | null;
};

type ReservationRequestMail = {
  venueId: string;
  fullName: string;
  email: string;
  phone: string;
  reservationDate: string;
  reservationTime: string;
  guestCount: number;
  note?: string | null;
  tableNumber?: string | null;
};

function requestDetailsHtml(reservation: ReservationMail) {
  const table = reservation.tableNumber
    ? `<p><strong>Masa:</strong> ${escapeHtml(reservation.tableNumber)}</p>`
    : "";
  const phone = reservation.phone
    ? `<p><strong>Telefon:</strong> ${escapeHtml(reservation.phone)}</p>`
    : "";
  const note = reservation.note
    ? `<p><strong>Notun:</strong> ${escapeHtml(reservation.note)}</p>`
    : "";
  return `<p><strong>Tarih:</strong> ${escapeHtml(reservation.reservationDate)}</p>
     <p><strong>Saat:</strong> ${escapeHtml(reservation.reservationTime)}</p>
     <p><strong>Kişi:</strong> ${reservation.guestCount}</p>
     ${phone}
     ${table}
     ${note}`;
}

export async function sendReservationRequestMailToVenue(
  reservation: ReservationRequestMail,
) {
  const { venue, emails } = await venueStaffEmails(reservation.venueId);
  if (!venue || !emails.length) return { sent: 0 };

  const adminLink = `${appUrl()}/admin/reservations`;
  const table = reservation.tableNumber
    ? `<p><strong>Masa:</strong> ${escapeHtml(reservation.tableNumber)}</p>`
    : "";
  const note = reservation.note
    ? `<p><strong>Not:</strong> ${escapeHtml(reservation.note)}</p>`
    : "";
  const subject = `${venue.name}: yeni rezervasyon talebi`;
  const text = `${reservation.fullName} · ${reservation.reservationDate} ${reservation.reservationTime} · ${reservation.guestCount} kişi · ${adminLink}`;
  const html = brandedEmail(
    "Yeni rezervasyon talebi",
    `<p><strong>${escapeHtml(venue.name)}</strong> için yeni bir rezervasyon talebi geldi.</p>
     <p><strong>Misafir:</strong> ${escapeHtml(reservation.fullName)}</p>
     <p><strong>Telefon:</strong> ${escapeHtml(reservation.phone)}</p>
     <p><strong>E-posta:</strong> ${escapeHtml(reservation.email)}</p>
     <p><strong>Tarih:</strong> ${escapeHtml(reservation.reservationDate)}</p>
     <p><strong>Saat:</strong> ${escapeHtml(reservation.reservationTime)}</p>
     <p><strong>Kişi:</strong> ${reservation.guestCount}</p>
     ${table}
     ${note}
     <p><a href="${escapeHtml(adminLink)}">Rezervasyonları aç</a></p>`,
  );

  let sent = 0;
  for (const to of emails) {
    const ok = await sendTransactionalEmail({
      to,
      subject,
      text,
      html,
      replyTo: reservation.email,
    });
    if (ok) sent += 1;
  }
  return { sent };
}

export function sendReservationStatusMail(
  reservation: ReservationMail,
  status: "CONFIRMED" | "REJECTED",
) {
  if (status === "CONFIRMED") {
    const table = reservation.tableNumber
      ? `<p><strong>Masa:</strong> ${escapeHtml(reservation.tableNumber)}</p>`
      : "";
    return sendTransactionalEmail({
      to: reservation.email,
      subject: `${reservation.venueName}: rezervasyonun onaylandı`,
      text: `${reservation.venueName} rezervasyonun onaylandı: ${reservation.reservationDate} ${reservation.reservationTime}${
        reservation.tableNumber ? ` · ${reservation.tableNumber}` : ""
      }`,
      html: brandedEmail(
        "Rezervasyonun onaylandı",
        `<p>Merhaba ${escapeHtml(reservation.fullName)},</p>
         <p><strong>${escapeHtml(reservation.venueName)}</strong> için yaptığın rezervasyon talebi onaylandı. Seni bekliyor olacağız.</p>
         <p><strong>Tarih:</strong> ${escapeHtml(reservation.reservationDate)}</p>
         <p><strong>Saat:</strong> ${escapeHtml(reservation.reservationTime)}</p>
         <p><strong>Kişi:</strong> ${reservation.guestCount}</p>
         ${table}`,
      ),
    });
  }

  const reason = reservation.rejectReason?.trim()
    ? `<p><strong>Red sebebi:</strong> ${escapeHtml(reservation.rejectReason.trim())}</p>`
    : "";
  return sendTransactionalEmail({
    to: reservation.email,
    subject: `${reservation.venueName}: rezervasyon talebin reddedildi`,
    text: `${reservation.venueName} rezervasyon talebin reddedildi. ${
      reservation.rejectReason?.trim()
        ? `Sebep: ${reservation.rejectReason.trim()}. `
        : ""
    }Talep: ${reservation.reservationDate} ${reservation.reservationTime}, ${reservation.guestCount} kişi.`,
    html: brandedEmail(
      "Rezervasyon talebin reddedildi",
      `<p>Merhaba ${escapeHtml(reservation.fullName)},</p>
       <p><strong>${escapeHtml(reservation.venueName)}</strong> için ilettiğin rezervasyon talebi maalesef onaylanamadı.</p>
       ${reason}
       <p><strong>Talebin:</strong></p>
       ${requestDetailsHtml(reservation)}`,
    ),
  });
}
