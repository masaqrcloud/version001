import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessAdmin, getStaffUser, homeForRole } from "@/lib/tenant";
import { NavLink, SideGroup, SignedInName } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { SidebarShell } from "@/components/sidebar-shell";

const venueLinks = [
  { href: "/admin", label: "Özet", exact: true },
  { href: "/admin/menu", label: "Menü" },
  { href: "/admin/tables", label: "Masalar" },
  { href: "/admin/staff", label: "Personel" },
  { href: "/admin/settings", label: "Ayarlar" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessAdmin(session.user.role)) {
    redirect(homeForRole(session.user.role));
  }

  const { user } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  const [venue, account] = await Promise.all([
    user?.venueId
      ? prisma.venue.findUnique({ where: { id: user.venueId } })
      : null,
    session.user.id
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, email: true },
        })
      : null,
  ]);

  return (
    <SidebarShell
      brandHref="/admin"
      brandAside={
        <div className="mt-3 flex items-center gap-3">
          {venue?.logoUrl ? (
            <div className="photo-box h-10 w-10 rounded-2xl border border-[var(--line)] bg-white">
              <img src={venue.logoUrl} alt="" />
            </div>
          ) : null}
          <p className="text-xs leading-snug text-[var(--muted)]">
            {user?.isPlatform
              ? venue
                ? `Uygulama sahibi · ${venue.name}`
                : "Uygulama sahibi"
              : venue?.name}
          </p>
        </div>
      }
      nav={
        <>
          <SideGroup title="Mekân">
            {venueLinks.map((link) => (
              <NavLink key={link.href} href={link.href} exact={link.exact}>
                {link.label}
              </NavLink>
            ))}
          </SideGroup>
          <SideGroup title="Salon">
            <NavLink href="/staff/waiter">Garson</NavLink>
            <NavLink href="/staff/kitchen">Mutfak</NavLink>
            <NavLink href="/staff/history">Geçmiş</NavLink>
            <NavLink href="/staff/summary">Gün sonu</NavLink>
          </SideGroup>
        </>
      }
      footer={
        <>
          <SignedInName
            name={account?.name ?? session.user.name}
            email={account?.email ?? session.user.email}
          />
          <SignOutButton />
        </>
      }
    >
      {children}
    </SidebarShell>
  );
}
