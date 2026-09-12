import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { MembersManager } from "@/app/admin/members/members-manager";
import { PageIntro } from "@/components/page-intro";

export default async function AdminMembersPage() {
  const { user } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  const venue = user?.venueId
    ? await prisma.venue.findUnique({ where: { id: user.venueId } })
    : null;

  if (!venue) {
    return (
      <div>
        <PageIntro kicker="Üyeler" title="Mail ile üye">
          Önce bir mekâna gir. Google ile bağlanan misafirler o mekânın içine
          yazılır.
        </PageIntro>
      </div>
    );
  }

  return (
    <div>
      <PageIntro kicker="Üyeler" title={venue.name}>
        Google ile bağlanan misafirleri gör. İlişği kesince bu mekânda otomatik
        tanınma durur; misafir kendi hesabını ayrıca silebilir.
      </PageIntro>
      <MembersManager />
    </div>
  );
}
