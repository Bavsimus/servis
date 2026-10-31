"use client";

import Link from "next/link";
import { listClients, listDrivers, listVehicles } from "@/lib/data/repo";
import { useData } from "@/lib/data/use-data";
import { useOrg } from "@/components/panel/org-context";
import { Card, PageHeader } from "@/components/panel/ui";

export default function PanelHome() {
  const { org } = useOrg();
  const { data } = useData(
    async () => {
      const [vehicles, drivers, clients] = await Promise.all([listVehicles(org.id), listDrivers(org.id), listClients(org.id)]);
      return { vehicles, drivers, clients };
    },
    [org.id],
  );
  const active = data?.vehicles.filter((v) => v.active) ?? [];
  const empty = data && data.vehicles.length === 0;

  return (
    <>
      <PageHeader title="Genel bakış" text={`${org.name} servis operasyonu.`} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Aktif araç" value={data ? active.length : "–"} />
        <Stat label="Vardiyalı araç" value={data ? active.filter((v) => v.layout === "vardiya").length : "–"} />
        <Stat label="Sürücü" value={data ? data.drivers.filter((d) => d.active).length : "–"} />
        <Stat label="Kurum" value={data ? data.clients.filter((c) => c.active).length : "–"} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Puantaj oluştur">
          <p className="text-sm text-muted">
            Kurumu ve ayı seçin, araç başına km ve mesaileri kontrol edin; kurumun formatındaki Excel dosyası tek tıkla
            hazırlansın. Oluşturulan her ay kaydedilir, istediğinizde tekrar indirebilirsiniz.
          </p>
          <Link href="/panel/puantaj" className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            Puantaja git
          </Link>
        </Card>
        <Card title={empty ? "İlk kurulum" : "Kısayollar"}>
          {empty ? (
            <p className="text-sm text-muted">
              Henüz araç yok. <Link href="/panel/araclar" className="font-medium text-fg underline">Araçlar</Link> sayfasından
              geçen ayın puantaj Excel&apos;ini yükleyin; araçlar, sürücüler ve son km bilgileri otomatik gelir.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/panel/kurumlar" className="text-fg underline">Kurumlar</Link>
                <span className="text-muted"> · çizelge formatı ve başlığı</span>
              </li>
              <li>
                <Link href="/panel/ayarlar" className="text-fg underline">Firma ve ekip</Link>
                <span className="text-muted"> · ekip arkadaşı ekleme, dışa aktarma</span>
              </li>
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}
