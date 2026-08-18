import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { SettingsForm } from "@/app/admin/settings/settings-form";
import { VenuesManager } from "@/app/admin/settings/venues-manager";
import { PageIntro } from "@/components/page-intro";

export default async function AdminSettingsPage() {
  const { user } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  const staff = user!;
  const venue = staff.venueId
    ? await prisma.venue.findUnique({ where: { id: staff.venueId } })
    : null;

  if (staff.isPlatform) {
    return (
      <div>
        <PageIntro kicker="Ayarlar" title="Mekânlar">
          Tüm kafeleri gör, yenisini ekle, yönetmek istediğine geç.
        </PageIntro>
        <VenuesManager canCreate />
        {venue ? (
          <div className="mt-12">
            <h2 className="text-2xl">Aktif mekan: {venue.name}</h2>
            <SettingsForm
              name={venue.name}
              slug={venue.slug}
              tagline={venue.tagline}
              logoUrl={venue.logoUrl}
              coverUrl={venue.coverUrl}
              openingHours={venue.openingHours}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <PageIntro kicker="Ayarlar" title="Mekân ayarları">
        Adın, logon ve kapak fotoğrafın misafirin QR ekranında görünür.
      </PageIntro>
      {venue ? (
        <SettingsForm
          name={venue.name}
          slug={venue.slug}
          tagline={venue.tagline}
          logoUrl={venue.logoUrl}
          coverUrl={venue.coverUrl}
          openingHours={venue.openingHours}
        />
      ) : (
        <p className="mt-8 text-[var(--muted)]">Mekan bulunamadı.</p>
      )}
    </div>
  );
}
