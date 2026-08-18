import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { lanOrigin } from "@/lib/public-url";
import { TablesManager } from "@/app/admin/tables/tables-manager";
import { PageIntro } from "@/components/page-intro";

export const dynamic = "force-dynamic";

export default async function AdminTablesPage() {
  const { user } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (!user?.venueId) {
    return (
      <div>
        <PageIntro kicker="Salon" title="Masalar ve QR">
          Önce Ayarlar’dan bir kafe seç veya ekle.
        </PageIntro>
      </div>
    );
  }
  const [venue, tables] = await Promise.all([
    prisma.venue.findUnique({
      where: { id: user.venueId },
      select: { name: true, logoUrl: true },
    }),
    prisma.table.findMany({
      where: { venueId: user.venueId },
      include: {
        sessions: {
          where: { status: "OPEN" },
          include: {
            guests: {
              where: { NOT: { nickname: null } },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { number: "asc" },
    }),
  ]);

  return (
    <div>
      <PageIntro kicker="Salon" title="Masalar ve QR">
        Masa ekle, QR oluşsun. Personel “Önizle” ile menüyü görür, masaya
        oturmuş sayılmaz.
      </PageIntro>
      <TablesManager
        phoneOrigin={lanOrigin()}
        logoUrl={venue?.logoUrl ?? null}
        initialTables={tables.map((table) => ({
          id: table.id,
          number: table.number,
          qrToken: table.qrToken,
          openGuests: table.sessions[0]?.guests.length ?? 0,
          isOpen: table.sessions.length > 0,
        }))}
      />
    </div>
  );
}
