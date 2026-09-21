import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { SettingsForm } from "@/app/admin/settings/settings-form";
import { LoyaltySettings } from "@/app/admin/settings/loyalty-settings";
import { VenuesManager } from "@/app/admin/settings/venues-manager";
import { ReportSettings } from "@/app/admin/settings/report-settings";
import { PageIntro } from "@/components/page-intro";

export default async function AdminSettingsPage() {
  const { user } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  const staff = user!;
  const venue = staff.venueId
    ? await prisma.venue.findUnique({ where: { id: staff.venueId } })
    : null;
  const reportFallback = venue
    ? await prisma.user.findMany({
        where: { venueId: venue.id, role: { in: ["OWNER", "ADMIN"] } },
        select: { email: true },
      })
    : [];
  const fallbackEmails = reportFallback.map((member) => member.email);

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
              wifiName={venue.wifiName}
              wifiPassword={venue.wifiPassword}
              address={venue.address}
              latitude={venue.latitude}
              longitude={venue.longitude}
            />
            <LoyaltySettings loyaltyItemId={venue.loyaltyItemId} />
            <ReportSettings
              reportEmail={venue.reportEmail}
              reportMail={venue.reportMail}
              fallbackEmails={fallbackEmails}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <PageIntro kicker="Ayarlar" title="Mekân ayarları">
        Adın, logon, Wi‑Fi bilgilerin ve kapak fotoğrafın misafirin QR
        ekranında görünür.
      </PageIntro>
      {venue ? (
        <>
        <SettingsForm
          name={venue.name}
          slug={venue.slug}
          tagline={venue.tagline}
          logoUrl={venue.logoUrl}
          coverUrl={venue.coverUrl}
          openingHours={venue.openingHours}
          wifiName={venue.wifiName}
          wifiPassword={venue.wifiPassword}
          address={venue.address}
          latitude={venue.latitude}
          longitude={venue.longitude}
        />
        <LoyaltySettings loyaltyItemId={venue.loyaltyItemId} />
        <ReportSettings
          reportEmail={venue.reportEmail}
          reportMail={venue.reportMail}
          fallbackEmails={fallbackEmails}
        />
        </>
      ) : (
        <p className="mt-8 text-[var(--muted)]">Mekan bulunamadı.</p>
      )}
    </div>
  );
}
