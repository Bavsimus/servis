"use client";

import { useRef, useState } from "react";
import {
  deleteVehicle,
  listClients,
  listDrivers,
  listVehicles,
  saveDriver,
  saveVehicle,
  setVehicleActive,
  setVehiclePositions,
} from "@/lib/data/repo";
import { useData } from "@/lib/data/use-data";
import { newVehicleRecord } from "@/lib/puantaj/defaults";
import { importPuantaj, type ImportResult } from "@/lib/puantaj/import";
import type { DriverRecord, VehicleRecord } from "@/lib/puantaj/types";
import { useOrg } from "@/components/panel/org-context";
import { Button, Card, PageHeader } from "@/components/panel/ui";
import { SCHEDULE_LABELS, VehicleForm } from "@/components/panel/vehicle-form";

const plateKey = (p: string) => p.replace(/\s/g, "").toLocaleUpperCase("tr-TR");

export default function VehiclesPage() {
  const { org } = useOrg();
  const { data, error: loadError, reload } = useData(
    async () => {
      const [vehicles, drivers, clients] = await Promise.all([listVehicles(org.id), listDrivers(org.id), listClients(org.id)]);
      return { vehicles, drivers, clients };
    },
    [org.id],
  );
  const [editing, setEditing] = useState<{ v: VehicleRecord; isNew: boolean } | null>(null);
  const [imported, setImported] = useState<(ImportResult & { file: ArrayBuffer; picked: boolean[]; clientId: string }) | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const vehicles = data?.vehicles ?? [];
  const drivers = data?.drivers ?? [];
  const clients = data?.clients ?? [];
  const driverName = (id: string) => drivers.find((d) => d.id === id)?.name ?? "";
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? "—";

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await reload();
    } catch (e) {
      const m = (e as Error).message;
      setError(m.includes("vehicles_org_id_plate_key") ? "Bu plakayla kayıtlı başka bir araç var." : m);
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= vehicles.length) return;
    const a = vehicles[index];
    const b = vehicles[j];
    run(() => setVehiclePositions([{ id: a.id, position: j }, { id: b.id, position: index }, ...renumber(index, j)]));
  }

  /** Eski kayıtlarda pozisyonlar çakışıyorsa sırayı baştan numaralandır */
  function renumber(...skip: number[]) {
    return vehicles.map((v, i) => ({ id: v.id, position: i })).filter((x, i) => !skip.includes(i) && vehicles[i].position !== x.position);
  }

  async function readFile(buf: ArrayBuffer, sheet?: string) {
    setError("");
    try {
      const res = await importPuantaj(buf, sheet);
      const counts = new Map<string, number>();
      res.months.forEach((m) => counts.set(m, (counts.get(m) ?? 0) + 1));
      // En sık geçen ay güncel kabul edilir; eski aydan kalan bloklar seçili gelmez
      const current = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      setImported({
        ...res,
        file: buf,
        picked: res.months.map((m) => m === current),
        clientId: imported?.clientId ?? clients[0]?.id ?? "",
      });
    } catch (e) {
      setError(`Dosya okunamadı: ${(e as Error).message}`);
    }
  }

  async function applyImport() {
    if (!imported) return;
    const known: DriverRecord[] = [...drivers];
    async function driverId(name: string, tc: string) {
      if (!name.trim()) return "";
      const hit = known.find((d) => (tc && d.tc === tc) || (!tc && d.name === name));
      if (hit) {
        if (hit.name !== name) await saveDriver(org.id, { ...hit, name });
        return hit.id;
      }
      const id = await saveDriver(org.id, { name, tc });
      known.push({ id, name, tc, phone: "", active: true });
      return id;
    }

    let next = vehicles.length;
    for (const [i, v] of imported.vehicles.entries()) {
      if (!imported.picked[i]) continue;
      const driverIds: string[] = [];
      for (const d of v.drivers) driverIds.push(await driverId(d.name, d.tc));
      const existing = vehicles.find((x) => plateKey(x.plate) === plateKey(v.plate));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { drivers: _, ...fields } = v;
      const record: VehicleRecord = existing
        ? { ...existing, ...fields, id: existing.id, active: existing.active, shift: existing.shift, position: existing.position, driverIds, clientId: imported.clientId || existing.clientId }
        : { ...fields, clientId: imported.clientId || null, position: next++, driverIds };
      await saveVehicle(org.id, record, !existing);
    }
    setImported(null);
  }

  return (
    <>
      <PageHeader
        title="Araçlar"
        text="Puantajda kullanılan araçlar. Sıralama Excel'deki sayfa sırasıdır."
        actions={
          <>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              Puantaj Excel&apos;inden içe aktar
            </Button>
            <Button onClick={() => setEditing({ v: newVehicleRecord({ position: vehicles.length, clientId: clients[0]?.id ?? null }), isNew: true })}>
              Araç ekle
            </Button>
          </>
        }
      />
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) readFile(await f.arrayBuffer());
        }}
      />
      {(error || loadError) && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error || loadError}</p>}

      {imported && (
        <Card
          className="mb-6"
          title="İçe aktarılacak araçlar"
          actions={
            <>
              <select
                className="rounded-lg border border-line-strong bg-ink px-2 py-1.5 text-sm"
                value={imported.sheetName}
                onChange={(e) => readFile(imported.file, e.target.value)}
                title="Excel sayfası"
              >
                {imported.sheetNames.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                className="rounded-lg border border-line-strong bg-ink px-2 py-1.5 text-sm"
                value={imported.clientId}
                onChange={(e) => setImported({ ...imported, clientId: e.target.value })}
                title="Kurum"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button variant="ghost" onClick={() => setImported(null)}>
                Vazgeç
              </Button>
              <Button onClick={() => run(applyImport)} disabled={busy || !imported.picked.some(Boolean)}>
                {busy ? "Kaydediliyor…" : "Seçilenleri kaydet"}
              </Button>
            </>
          }
        >
          <p className="mb-3 text-sm text-muted">
            Aynı plakalı araç varsa bilgileri güncellenir; sürücüler T.C. kimlik numarasına göre eşleştirilir, yoksa
            eklenir. Ayı güncel olmayan bloklar (eski aydan kalmış sayfalar) seçili gelmez; son km&apos;leri yanlış
            olabilir.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="w-8 py-2"></th>
                  <th className="py-2">Plaka</th>
                  <th>Cinsi</th>
                  <th>Sürücü</th>
                  <th>Ay</th>
                  <th className="text-right">Son km</th>
                  <th className="text-right">Günlük km</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {imported.vehicles.map((v, i) => (
                  <tr key={i} className={imported.picked[i] ? "" : "text-subtle"}>
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={imported.picked[i]}
                        onChange={(e) => setImported({ ...imported, picked: imported.picked.map((p, j) => (j === i ? e.target.checked : p)) })}
                      />
                    </td>
                    <td className="font-medium">{v.plate}</td>
                    <td>{v.kind}</td>
                    <td>{v.drivers.map((d) => d.name).join(", ")}</td>
                    <td>{imported.months[i]}</td>
                    <td className="text-right tabular-nums">{v.lastKm.toLocaleString("tr-TR")}</td>
                    <td className="text-right tabular-nums">
                      {v.kmMin}–{v.kmMax}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editing && (
        <Card
          className="mb-6"
          title={editing.isNew ? "Yeni araç" : `${editing.v.plate} düzenleniyor`}
          actions={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Vazgeç
              </Button>
              <Button
                disabled={busy || !editing.v.plate.trim()}
                onClick={() =>
                  run(async () => {
                    await saveVehicle(org.id, editing.v, editing.isNew);
                    setEditing(null);
                  })
                }
              >
                Kaydet
              </Button>
            </>
          }
        >
          <VehicleForm value={editing.v} onChange={(v) => setEditing({ ...editing, v })} drivers={drivers} clients={clients} />
        </Card>
      )}

      <Card>
        {data && vehicles.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted">
            <p className="font-medium text-fg">Henüz araç yok</p>
            <p className="mt-1">Geçen ayın puantaj dosyasını içe aktararak başlayın ya da araçları tek tek ekleyin.</p>
          </div>
        ) : (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-raised text-left text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Sıra</th>
                  <th className="font-medium">Plaka</th>
                  <th className="font-medium">Cinsi / poz</th>
                  <th className="font-medium">Kurum</th>
                  <th className="font-medium">Sürücü</th>
                  <th className="font-medium">Çalışma</th>
                  <th className="text-right font-medium">Son km</th>
                  <th className="px-4 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {vehicles.map((v, i) => (
                  <tr key={v.id} className={v.active ? "" : "bg-raised text-subtle"}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <span className="w-5 tabular-nums">{i + 1}</span>
                        <button className="rounded px-1 hover:bg-white/5" disabled={busy} onClick={() => move(i, -1)} aria-label="Yukarı taşı">
                          ↑
                        </button>
                        <button className="rounded px-1 hover:bg-white/5" disabled={busy} onClick={() => move(i, 1)} aria-label="Aşağı taşı">
                          ↓
                        </button>
                      </div>
                    </td>
                    <td className="font-medium">{v.plate}</td>
                    <td>
                      {v.kind} <span className="text-subtle">· {v.poz}</span>
                    </td>
                    <td className="text-muted">{clientName(v.clientId)}</td>
                    <td>
                      {v.layout === "vardiya" ? (
                        <span title={v.driverIds.map(driverName).join(", ")}>3 sürücü (vardiya)</span>
                      ) : (
                        driverName(v.driverIds[0] ?? "") || <span className="text-subtle">—</span>
                      )}
                    </td>
                    <td>{SCHEDULE_LABELS[v.schedule]}</td>
                    <td className="text-right tabular-nums">{v.lastKm.toLocaleString("tr-TR")}</td>
                    <td className="whitespace-nowrap px-4 text-right">
                      <Button variant="ghost" onClick={() => run(() => setVehicleActive(v.id, !v.active))}>
                        {v.active ? "Pasifleştir" : "Aktifleştir"}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing({ v, isNew: false })}>
                        Düzenle
                      </Button>
                      <Button variant="danger" onClick={() => confirm(`${v.plate} silinsin mi?`) && run(() => deleteVehicle(v.id))}>
                        Sil
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
