"use client";

import { useRef, useState } from "react";
import {
  deleteVehicle,
  listAssignments,
  listClients,
  listDrivers,
  listVehicles,
  saveDriver,
  saveVehicle,
  setAssignmentPositions,
  setVehicleActive,
  syncAssignments,
  upsertAssignment,
} from "@/lib/data/repo";
import { useData } from "@/lib/data/use-data";
import { newAssignment, newVehicleRecord } from "@/lib/puantaj/defaults";
import { importPuantaj, type ImportResult } from "@/lib/puantaj/import";
import type { Assignment, DriverRecord, VehicleRecord } from "@/lib/puantaj/types";
import { useOrg } from "@/components/panel/org-context";
import { Button, Card, PageHeader } from "@/components/panel/ui";
import { SCHEDULE_LABELS, VehicleForm, type VehicleDraft } from "@/components/panel/vehicle-form";

const plateKey = (p: string) => p.replace(/\s/g, "").toLocaleUpperCase("tr-TR");
const ALL = "";

export default function VehiclesPage() {
  const { org } = useOrg();
  const { data, error: loadError, reload } = useData(
    async () => {
      const [vehicles, drivers, clients, assignments] = await Promise.all([
        listVehicles(org.id),
        listDrivers(org.id),
        listClients(org.id),
        listAssignments(org.id),
      ]);
      return { vehicles, drivers, clients, assignments };
    },
    [org.id],
  );
  const [filter, setFilter] = useState(ALL);
  const [editing, setEditing] = useState<(VehicleDraft & { isNew: boolean }) | null>(null);
  const [imported, setImported] = useState<(ImportResult & { file: ArrayBuffer; picked: boolean[]; clientId: string }) | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const vehicles = data?.vehicles ?? [];
  const drivers = data?.drivers ?? [];
  const clients = data?.clients ?? [];
  const assignments = data?.assignments ?? [];
  const driverName = (id: string) => drivers.find((d) => d.id === id)?.name ?? "";
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "";
  const assignmentsOf = (vehicleId: string) => assignments.filter((a) => a.vehicleId === vehicleId);
  const nextPosition = (clientId: string, list = assignments) =>
    Math.max(-1, ...list.filter((a) => a.clientId === clientId).map((a) => a.position)) + 1;

  // Kurum seçiliyse o kurumun Excel sırası, değilse plaka sırası
  const rows: { v: VehicleRecord; a?: Assignment }[] = filter
    ? assignments
        .filter((a) => a.clientId === filter)
        .map((a) => ({ v: vehicles.find((v) => v.id === a.vehicleId)!, a }))
        .filter((r) => r.v)
    : vehicles.map((v) => ({ v }));

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await reload();
    } catch (e) {
      const m = (e as Error).message;
      setError(
        m.includes("vehicles_org_id_plate_key")
          ? "Bu plakayla kayıtlı başka bir araç var."
          : m.includes("vehicle_assignments_vehicle_id_client_id_key")
            ? "Araç aynı kuruma iki kez eklenemez."
            : m,
      );
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (!filter || j < 0 || j >= rows.length) return;
    const order = rows.map((r) => r.a!);
    [order[index], order[j]] = [order[j], order[index]];
    run(() => setAssignmentPositions(order.map((a, i) => ({ id: a.id, position: i })).filter((x, i) => order[i].position !== x.position)));
  }

  async function saveDraft(d: VehicleDraft & { isNew: boolean }) {
    const vehicleId = await saveVehicle(org.id, d.vehicle, d.isNew);
    const previous = d.isNew ? [] : assignmentsOf(d.vehicle.id);
    const withPositions = d.assignments.map((a) => {
      const old = previous.find((p) => p.id === a.id);
      // yeni eklenen ya da kurumu değişen görev o kurumun listesinin sonuna gider
      return old && old.clientId === a.clientId ? a : { ...a, position: nextPosition(a.clientId) };
    });
    await syncAssignments(org.id, vehicleId, withPositions, previous);
    setEditing(null);
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
        clientId: imported?.clientId || filter || clients[0]?.id || "",
      });
    } catch (e) {
      setError(`Dosya okunamadı: ${(e as Error).message}`);
    }
  }

  async function applyImport() {
    if (!imported?.clientId) throw new Error("Kurum seçin.");
    const clientId = imported.clientId;
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

    let position = nextPosition(clientId);
    for (const [i, x] of imported.vehicles.entries()) {
      if (!imported.picked[i]) continue;
      const driverIds: string[] = [];
      for (const d of x.drivers) driverIds.push(await driverId(d.name, d.tc));
      const existing = vehicles.find((v) => plateKey(v.plate) === plateKey(x.plate));
      const vehicle: VehicleRecord = {
        ...(existing ?? newVehicleRecord()),
        plate: x.plate,
        brand: x.brand,
        kind: x.kind,
        modelYear: x.modelYear,
        layout: x.layout,
        hours: x.hours,
        driverIds,
      };
      const vehicleId = await saveVehicle(org.id, vehicle, !existing);
      const current = existing && assignments.find((a) => a.vehicleId === existing.id && a.clientId === clientId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _, ...fields } = newAssignment({ vehicleId, clientId });
      await upsertAssignment(org.id, {
        ...fields,
        active: current?.active ?? true,
        position: current?.position ?? position++,
        poz: x.poz,
        route: x.route,
        schedule: x.schedule,
        kmMin: x.kmMin,
        kmMax: x.kmMax,
        lastKm: x.lastKm,
      });
    }
    setImported(null);
  }

  return (
    <>
      <PageHeader
        title="Araçlar"
        text="Bir araç birden fazla kurumda çalışabilir. Kurum seçince o kurumun Excel'deki sayfa sırasını düzenleyebilirsiniz."
        actions={
          <>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              Puantaj Excel&apos;inden içe aktar
            </Button>
            <Button
              onClick={() => {
                const vehicle = newVehicleRecord();
                const clientId = filter || clients[0]?.id;
                setEditing({ vehicle, assignments: clientId ? [newAssignment({ vehicleId: vehicle.id, clientId })] : [], isNew: true });
              }}
            >
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
            Dosya seçilen kurumun puantajı olarak okunur: poz no, güzergâh ve son km o kuruma yazılır, aracın diğer
            kurumlardaki bilgileri değişmez. Aynı plakalı araç varsa güncellenir; sürücüler T.C. kimlik numarasına göre
            eşleştirilir. Ayı güncel olmayan bloklar seçili gelmez.
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
          title={editing.isNew ? "Yeni araç" : `${editing.vehicle.plate} düzenleniyor`}
          actions={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Vazgeç
              </Button>
              <Button disabled={busy || !editing.vehicle.plate.trim()} onClick={() => run(() => saveDraft(editing))}>
                Kaydet
              </Button>
            </>
          }
        >
          <VehicleForm value={editing} onChange={(d) => setEditing({ ...editing, ...d })} drivers={drivers} clients={clients} />
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-1">
        {[{ id: ALL, name: "Tüm araçlar" }, ...clients].map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${filter === c.id ? "bg-white/10 font-medium text-fg" : "text-muted hover:bg-white/5 hover:text-fg"}`}
          >
            {c.name}
            {c.id && <span className="ml-1.5 text-xs text-subtle">{assignments.filter((a) => a.clientId === c.id).length}</span>}
          </button>
        ))}
      </div>

      <Card>
        {data && rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted">
            <p className="font-medium text-fg">{filter ? "Bu kurumda araç yok" : "Henüz araç yok"}</p>
            <p className="mt-1">Geçen ayın puantaj dosyasını içe aktararak başlayın ya da araçları tek tek ekleyin.</p>
          </div>
        ) : (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-raised text-left text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{filter ? "Sıra" : ""}</th>
                  <th className="font-medium">Plaka</th>
                  <th className="font-medium">Cinsi</th>
                  <th className="font-medium">Sürücü</th>
                  <th className="font-medium">{filter ? "Poz / çalışma" : "Kurumlar"}</th>
                  <th className="text-right font-medium">{filter ? "Son km" : ""}</th>
                  <th className="px-4 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ v, a }, i) => (
                  <tr key={a?.id ?? v.id} className={v.active && (a?.active ?? true) ? "" : "bg-raised text-subtle"}>
                    <td className="px-4 py-2.5">
                      {filter && (
                        <div className="flex items-center gap-1">
                          <span className="w-5 tabular-nums">{i + 1}</span>
                          <button className="rounded px-1 hover:bg-white/5" disabled={busy} onClick={() => move(i, -1)} aria-label="Yukarı taşı">
                            ↑
                          </button>
                          <button className="rounded px-1 hover:bg-white/5" disabled={busy} onClick={() => move(i, 1)} aria-label="Aşağı taşı">
                            ↓
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="font-medium">{v.plate}</td>
                    <td>{v.kind}</td>
                    <td>
                      {v.layout === "vardiya" ? (
                        <span title={v.driverIds.map(driverName).join(", ")}>3 sürücü (vardiya)</span>
                      ) : (
                        driverName(v.driverIds[0] ?? "") || <span className="text-subtle">—</span>
                      )}
                    </td>
                    <td>
                      {a ? (
                        <>
                          {a.poz} <span className="text-subtle">· {SCHEDULE_LABELS[a.schedule]}</span>
                        </>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {assignmentsOf(v.id).map((x) => (
                            <span key={x.id} className="rounded-full bg-raised px-2 py-0.5 text-xs text-muted">
                              {clientName(x.clientId)}
                            </span>
                          ))}
                          {assignmentsOf(v.id).length === 0 && <span className="text-xs text-amber-300">Kuruma atanmamış</span>}
                        </div>
                      )}
                    </td>
                    <td className="text-right tabular-nums">{a ? a.lastKm.toLocaleString("tr-TR") : ""}</td>
                    <td className="whitespace-nowrap px-4 text-right">
                      <Button variant="ghost" onClick={() => run(() => setVehicleActive(v.id, !v.active))}>
                        {v.active ? "Pasifleştir" : "Aktifleştir"}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing({ vehicle: v, assignments: assignmentsOf(v.id), isNew: false })}>
                        Düzenle
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => confirm(`${v.plate} tüm kurumlardan silinsin mi?`) && run(() => deleteVehicle(v.id))}
                      >
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
