"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="font-serif text-[1.35rem] tracking-tight">
      MasaQR
    </Link>
  );
}

export function SideGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="side-group">
      <p className="side-group-title">{title}</p>
      {children}
    </div>
  );
}

export function NavLink({
  href,
  exact,
  children,
  badge,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
  badge?: number | null;
}) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
  const showBadge = typeof badge === "number" && badge > 0;

  return (
    <Link href={href} className={cn("side-link", active && "side-link-active")}>
      <span className="side-link-label">{children}</span>
      {showBadge ? (
        <span className="side-link-badge" aria-label={`${badge} yeni`}>
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

export function SignedInName({
  name,
  email,
}: {
  name?: string | null;
  email?: string | null;
}) {
  if (!name && !email) return null;
  return (
    <div className="side-user">
      <p className="truncate font-medium text-[var(--ink)]">{name ?? email}</p>
      {name && email ? (
        <p className="truncate text-xs text-[var(--muted)]">{email}</p>
      ) : null}
    </div>
  );
}

