import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { PageIntro } from "@/components/page-intro";
import { ReservationsManager } from "@/app/admin/reservations/reservations-manager";

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  const { user } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  const staff = user!;
  const [reservations, tables] = await Promise.all([
    prisma.reservation.findMany({
      where: { venueId: staff.venueId },
      orderBy: [
        { reservationDate: "asc" },
        { reservationTime: "asc" },
      ],
    }),
    prisma.table.findMany({
      where: { venueId: staff.venueId },
      orderBy: { number: "asc" },
      select: { id: true, number: true },
    }),
  ]);

  return (
    <div>
      <PageIntro kicker="Mekân" title="Rezervasyonlar">
        Talepleri onayla, masa ata ve misafire otomatik bilgi ver.
      </PageIntro>
      <div className="mt-8">
        <ReservationsManager
          reservations={reservations.map((reservation) => ({
            id: reservation.id,
            fullName: reservation.fullName,
            email: reservation.email,
            phone: reservation.phone,
            guestCount: reservation.guestCount,
            reservationDate: reservation.reservationDate,
            reservationTime: reservation.reservationTime,
            note: reservation.note,
            status: reservation.status,
            tableId: reservation.tableId,
          }))}
          tables={tables}
        />
      </div>
    </div>
  );
}
