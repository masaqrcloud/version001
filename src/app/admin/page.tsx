import Link from "next/link";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { Card } from "@/components/ui/card";
import { PageIntro } from "@/components/page-intro";
import { VenueSwitchButton } from "@/app/admin/venue-switch-button";

export default async function AdminHomePage() {
  const { user } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  const staff = user!;

  if (staff.isPlatform) {
    const venues = await prisma.venue.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { tables: true, users: true, categories: true } },
      },
    });
    const [tableCount, itemCount, openSessions, staffCount] = await Promise.all([
      prisma.table.count(),
      prisma.menuItem.count(),
      prisma.tableSession.count({ where: { status: "OPEN" } }),
      prisma.user.count({ where: { role: { not: "PLATFORM" } } }),
    ]);

    return (
      <div>
        <PageIntro kicker="Uygulama sahibi" title="Tüm mekânlar">
          Bir kafeye girince o mekânın sahibini, yöneticisini ve garsonunu
          orada oluşturursun. Her hesap sadece kendi evini görür.
        </PageIntro>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Mekan", value: venues.length },
            { label: "Masa", value: tableCount },
            { label: "Açık oturum", value: openSessions },
            { label: "Personel", value: staffCount },
          ].map((card) => (
            <Card key={card.label} className="p-5">
              <p className="text-sm text-[var(--muted)]">{card.label}</p>
              <p className="mt-2 font-serif text-4xl">{card.value}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {venues.map((venue) => (
            <Card key={venue.id} className="overflow-hidden">
              {venue.coverUrl ? (
                <div className="photo-box h-28 w-full">
                  <img src={venue.coverUrl} alt="" />
                </div>
              ) : null}
              <div className="flex items-start gap-4 p-5">
                {venue.logoUrl ? (
                  <div className="photo-box h-16 w-16 rounded-2xl border border-[var(--line)] bg-white">
                    <img src={venue.logoUrl} alt="" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] font-serif text-2xl text-[var(--accent)]">
                    {venue.name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-2xl">{venue.name}</p>
                  {venue.tagline ? (
                    <p className="mt-0.5 text-sm text-[var(--muted)]">{venue.tagline}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {venue._count.tables} masa · {venue._count.categories} kategori ·{" "}
                    {venue._count.users} personel
                    {venue.id === staff.venueId ? " · şu an bu mekan" : ""}
                  </p>
                  <div className="mt-4">
                    <VenueSwitchButton
                      venueId={venue.id}
                      venueName={venue.name}
                      isActive={venue.id === staff.venueId}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-sm text-[var(--muted)]">
          Toplam {itemCount} ürün kayıtlı. Bir mekâna geçmek için karttaki
          butonu kullan.
        </p>
      </div>
    );
  }

  const venueId = staff.venueId;
  const [venue, tableCount, itemCount, openSessions, staffCount] =
    await Promise.all([
      prisma.venue.findUnique({ where: { id: venueId } }),
      prisma.table.count({ where: { venueId } }),
      prisma.menuItem.count({ where: { category: { venueId } } }),
      prisma.tableSession.count({
        where: { status: "OPEN", table: { venueId } },
      }),
      prisma.user.count({ where: { venueId } }),
    ]);

  const cards = [
    { href: "/admin/tables", label: "Masa", value: tableCount },
    { href: "/admin/menu", label: "Ürün", value: itemCount },
    { href: "/staff/waiter", label: "Açık oturum", value: openSessions },
    { href: "/admin/staff", label: "Personel", value: staffCount },
  ];

  return (
    <div>
      <PageIntro kicker="Mekân yönetimi" title={venue?.name ?? "Mekân"}>
        Masalar, menü ve ekip aynı evin içinde.
      </PageIntro>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="p-5">
              <p className="text-sm text-[var(--muted)]">{card.label}</p>
              <p className="mt-2 font-serif text-4xl">{card.value}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
