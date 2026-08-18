import {
  brandedEmail,
  escapeHtml,
  sendTransactionalEmail,
} from "@/lib/mail";

type ReservationMail = {
  email: string;
  fullName: string;
  venueName: string;
  reservationDate: string;
  reservationTime: string;
  guestCount: number;
  tableNumber?: string | null;
};

export function sendReservationStatusMail(
  reservation: ReservationMail,
  status: "CONFIRMED" | "REJECTED",
) {
  const confirmed = status === "CONFIRMED";
  const table = reservation.tableNumber
    ? `<p><strong>Masa:</strong> ${escapeHtml(reservation.tableNumber)}</p>`
    : "";
  return sendTransactionalEmail({
    to: reservation.email,
    subject: `${reservation.venueName} rezervasyonun ${confirmed ? "onaylandı" : "hakkında"}`,
    text: confirmed
      ? `${reservation.venueName} rezervasyonun onaylandı: ${reservation.reservationDate} ${reservation.reservationTime}`
      : `${reservation.venueName} rezervasyonun şu aşamada onaylanamadı.`,
    html: brandedEmail(
      confirmed ? "Rezervasyonun hazır" : "Rezervasyonun hakkında",
      `<p>Merhaba ${escapeHtml(reservation.fullName)},</p>
       <p><strong>${escapeHtml(reservation.venueName)}</strong> rezervasyonun ${
         confirmed ? "onaylandı." : "şu aşamada onaylanamadı."
       }</p>
       <p><strong>Tarih:</strong> ${escapeHtml(reservation.reservationDate)}</p>
       <p><strong>Saat:</strong> ${escapeHtml(reservation.reservationTime)}</p>
       <p><strong>Kişi:</strong> ${reservation.guestCount}</p>
       ${table}`,
    ),
  });
}
