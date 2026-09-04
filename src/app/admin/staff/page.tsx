import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { StaffManager } from "@/app/admin/staff/staff-manager";
import { PageIntro } from "@/components/page-intro";

export default async function AdminStaffPage() {
  const { user } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  const staff = user!;
  const venue = staff.venueId
    ? await prisma.venue.findUnique({ where: { id: staff.venueId } })
    : null;

  if (!venue) {
    return (
      <div>
        <PageIntro kicker="Ekip" title="Personel">
          Önce bir mekâna gir. Hesaplar o mekânın içine yazılır.
        </PageIntro>
      </div>
    );
  }

  return (
    <div>
      <PageIntro kicker="Ekip" title={venue.name}>
        Bu mekânın sahibi, yöneticisi, garsonu ve mutfağı burada. Hesap sadece
        bu mekânı görür.
      </PageIntro>
      <StaffManager
        venueName={venue.name}
        canCreateOwner={staff.isPlatform}
      />
    </div>
  );
}
