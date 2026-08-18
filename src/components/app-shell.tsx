import type { ReactNode } from "react";
import { Brand } from "@/components/app-nav";

export function AppShell({
  brandHref = "/",
  brandAside,
  nav,
  children,
}: {
  brandHref?: string;
  brandAside?: ReactNode;
  nav?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-frame app-header-inner">
          <div className="flex items-center gap-3">
            <Brand href={brandHref} />
            {brandAside}
          </div>
          {nav ? <nav className="app-nav">{nav}</nav> : null}
        </div>
      </header>
      <main className="app-frame app-main">{children}</main>
    </div>
  );
}
