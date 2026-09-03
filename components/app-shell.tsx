"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Database, LayoutDashboard, MapPinned, Menu, Search, Sprout, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agencies", label: "Agency finder", icon: Search },
  { href: "/pipeline", label: "Deal pipeline", icon: Building2 },
  { href: "/settings", label: "Data & research", icon: Database },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="app-frame">
      <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <aside className={clsx("sidebar", open && "sidebar-open")}>
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark"><Sprout size={20} /></span>
          <span><strong>Fieldnote</strong><small>Agency intelligence</small></span>
        </Link>
        <nav aria-label="Primary navigation">
          <p className="nav-kicker">Workspace</p>
          {nav.map((item) => {
            const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} className={clsx("nav-link", active && "nav-active")} onClick={() => setOpen(false)}><Icon size={18} />{item.label}</Link>;
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="scope-chip"><MapPinned size={15} /> Texas pilot</div>
          <p>Screening intelligence only. Verify every estimate in diligence.</p>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

