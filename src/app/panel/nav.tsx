"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { product } from "@/config/product";
import { supabase } from "@/lib/supabase/client";
import { useOrg } from "@/components/panel/org-context";

const items = [
  { href: "/panel", label: "Genel bakış" },
  { href: "/panel/puantaj", label: "Puantaj oluştur" },
  { href: "/panel/araclar", label: "Araçlar" },
  { href: "/panel/suruculer", label: "Sürücüler" },
  { href: "/panel/kurumlar", label: "Kurumlar" },
  { href: "/panel/ayarlar", label: "Firma ve ekip" },
];

export function PanelNav() {
  const path = usePathname();
  const { org, orgs, email, switchOrg } = useOrg();
  // panel.alanadi.com üzerinde yol /panel önekini taşımayabilir
  const current = path.startsWith("/panel") ? path : `/panel${path === "/" ? "" : path}`;

  async function logout() {
    await supabase().auth.signOut();
    window.location.href = "/giris";
  }

  return (
    <aside className="border-b border-line bg-surface md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:border-b-0 md:border-r">
      <div className="px-5 py-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-subtle">
          <span className="size-1.5 rounded-full bg-brand" />
          {product.name}
        </p>
        {orgs.length > 1 ? (
          <select
            value={org.id}
            onChange={(e) => switchOrg(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-ink px-2 py-1.5 font-display text-base font-bold"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-2 truncate font-display text-lg font-bold">{org.name}</p>
        )}
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
        {items.map((i) => {
          const active = current === i.href;
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`relative whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                active ? "bg-white/[0.06] font-medium text-fg" : "text-muted hover:bg-white/[0.03] hover:text-fg"
              }`}
            >
              {active && <span className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-brand md:block" />}
              {i.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line px-5 py-4 text-sm">
        <span className="truncate text-xs text-subtle" title={email}>
          {email}
        </span>
        <button onClick={logout} className="shrink-0 text-muted transition hover:text-fg">
          Çıkış
        </button>
      </div>
    </aside>
  );
}
