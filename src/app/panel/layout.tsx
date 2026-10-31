import type { Metadata } from "next";
import { product } from "@/config/product";
import { OrgProvider } from "@/components/panel/org-context";
import { PanelNav } from "./nav";

export const metadata: Metadata = { title: product.name, robots: { index: false } };

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ink">
      <OrgProvider>
        <div className="md:grid md:grid-cols-[232px_1fr]">
          <PanelNav />
          <main className="min-w-0 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </OrgProvider>
    </div>
  );
}
