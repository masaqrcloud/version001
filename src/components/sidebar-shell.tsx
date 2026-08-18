"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/app-nav";

export function SidebarShell({
  brandHref = "/",
  brandAside,
  nav,
  footer,
  children,
}: {
  brandHref?: string;
  brandAside?: ReactNode;
  nav?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell-side">
      <div className="sidebar-topbar">
        <Brand href={brandHref} />
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setOpen(true)}
        >
          Menü
        </button>
      </div>
      {open ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside className={`app-sidebar${open ? " is-open" : ""}`}>
        <div className="app-sidebar-brand">
          <Brand href={brandHref} />
          {brandAside}
        </div>
        {nav ? <nav className="app-sidebar-nav">{nav}</nav> : null}
        {footer ? <div className="app-sidebar-footer">{footer}</div> : null}
      </aside>
      <main className="app-side-main">
        <div className="app-side-main-inner">{children}</div>
      </main>
    </div>
  );
}
