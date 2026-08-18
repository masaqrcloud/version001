import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NavLink, SideGroup, SignedInName } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { SidebarShell } from "@/components/sidebar-shell";
import {
  canAccessAdmin,
  canAccessKitchen,
  canAccessReports,
  canAccessWaiter,
  homeForRole,
} from "@/lib/tenant";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  const [venue, account] = await Promise.all([
    session.user.venueId
      ? prisma.venue.findUnique({
          where: { id: session.user.venueId },
          select: { name: true, logoUrl: true },
        })
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
      brandHref={homeForRole(role)}
      brandAside={
        venue ? (
          <div className="mt-3 flex items-center gap-3">
            {venue.logoUrl ? (
              <div className="photo-box h-10 w-10 rounded-2xl border border-[var(--line)] bg-white">
                <img src={venue.logoUrl} alt="" />
              </div>
            ) : null}
            <p className="text-xs leading-snug text-[var(--muted)]">
              {venue.name}
            </p>
          </div>
        ) : null
      }
      nav={
        <>
          {canAccessAdmin(role) ? (
            <SideGroup title="Mekân">
              <NavLink href="/admin">Admin</NavLink>
            </SideGroup>
          ) : null}
          <SideGroup title="Salon">
            {canAccessWaiter(role) ? (
              <NavLink href="/staff/waiter">Garson</NavLink>
            ) : null}
            {canAccessKitchen(role) ? (
              <NavLink href="/staff/kitchen">Mutfak</NavLink>
            ) : null}
            {canAccessReports(role) ? (
              <NavLink href="/staff/history">Geçmiş</NavLink>
            ) : null}
            {canAccessReports(role) ? (
              <NavLink href="/staff/summary">Gün sonu</NavLink>
            ) : null}
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
