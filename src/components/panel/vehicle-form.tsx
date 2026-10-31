"use client";

import { newAssignment, withLayout } from "@/lib/puantaj/defaults";
import type { Assignment, Client, DriverRecord, Schedule, VehicleRecord as Vehicle } from "@/lib/puantaj/types";
import { Button, Field, inputCls } from "./ui";

export const SCHEDULE_LABELS: Record<Schedule, string> = {
  "hafta-ici": "Hafta içi (tatiller hariç)",
  "hafta-ici-cumartesi": "Hafta içi + Cumartesi",
  "her-gun": "Her gün (tatiller dahil)",
};

export interface VehicleDraft {
  vehicle: Vehicle;
  assignments: Assignment[];
}

const up = (s: string) => s.toLocaleUpperCase("tr-TR");

export function VehicleForm({
  value,
  onChange,
  drivers,
  clients,
}: {
  value: VehicleDraft;
  onChange: (v: VehicleDraft) => void;
  drivers: DriverRecord[];
  clients: Client[];
}) {
  const v = value.vehicle;
  const set = <K extends keyof Vehicle>(k: K, val: Vehicle[K]) => onChange({ ...value, vehicle: { ...v, [k]: val } });
  const setAssignment = (i: number, a: Assignment) =>
    onChange({ ...value, assignments: value.assignments.map((x, j) => (j === i ? a : x)) });
  const freeClients = clients.filter((c) => !value.assignments.some((a) => a.clientId === c.id));

  return (
    <div className="space-y-6">
      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold">Araç</legend>
        <Field label="Plaka">
          <input className={inputCls} value={v.plate} onChange={(e) => set("plate", up(e.target.value))} placeholder="41 P 1234" />
        </Field>
        <Field label="Marka / model">
          <input className={inputCls} value={v.brand} onChange={(e) => set("brand", up(e.target.value))} />
        </Field>
        <Field label="Cinsi">
          <input className={inputCls} list="kinds" value={v.kind} onChange={(e) => set("kind", up(e.target.value))} />
          <datalist id="kinds">
            {["MİNİBÜS", "MİDİBÜS", "KAMYONET", "PANELVAN", "OTOMOBİL"].map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </Field>
        <Field label="Model yılı">
          <input className={inputCls} inputMode="numeric" value={v.modelYear} onChange={(e) => set("modelYear", e.target.value)} />
        </Field>
        <Field label="Çizelge tipi">
          <select
            className={inputCls}
            value={v.layout}
            onChange={(e) => onChange({ ...value, vehicle: withLayout(v, e.target.value as Vehicle["layout"]) })}
          >
            <option value="tek">Tek sürücü</option>
            <option value="vardiya">3 sürücü, gündüz/gece vardiya</option>
          </select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold">Sürücü{v.driverIds.length > 1 ? "ler" : ""}</legend>
        {v.driverIds.map((id, i) => (
          <Field key={i} label={v.driverIds.length > 1 ? `${i + 1}. sürücü` : "Sürücü"}>
            <select
              className={inputCls}
              value={id}
              onChange={(e) => set("driverIds", v.driverIds.map((x, j) => (j === i ? e.target.value : x)))}
            >
              <option value="">Seçilmedi</option>
              {drivers
                .filter((d) => d.active || d.id === id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.tc ? ` · ${d.tc.slice(0, 3)}…${d.tc.slice(-2)}` : ""}
                  </option>
                ))}
            </select>
          </Field>
        ))}
        {drivers.length === 0 && <p className="text-xs text-muted sm:col-span-3">Önce Sürücüler sayfasından sürücü ekleyin.</p>}
      </fieldset>

      {v.layout === "tek" ? (
        <fieldset className="grid gap-3 sm:grid-cols-4">
          <legend className="mb-2 text-sm font-semibold">Mesai saatleri</legend>
          <label className="flex items-center gap-2 text-sm sm:col-span-4">
            <input type="checkbox" checked={v.hours.enabled} onChange={(e) => set("hours", { ...v.hours, enabled: e.target.checked })} />
            Gün başı / gün sonu saatleri ve fazla çalışma yazılsın
          </label>
          {v.hours.enabled && (
            <>
              <Field label="Gün başı (sa)">
                <input className={inputCls} value={v.hours.start} onChange={(e) => set("hours", { ...v.hours, start: e.target.value })} />
              </Field>
              <Field label="Gün sonu (sa)">
                <input className={inputCls} value={v.hours.end} onChange={(e) => set("hours", { ...v.hours, end: e.target.value })} />
              </Field>
              <Field label="Fazla çalışma (sa/gün)">
                <input className={inputCls} type="number" value={v.hours.overtime} onChange={(e) => set("hours", { ...v.hours, overtime: Number(e.target.value) })} />
              </Field>
            </>
          )}
        </fieldset>
      ) : (
        <fieldset className="grid gap-3 sm:grid-cols-4">
          <legend className="mb-2 text-sm font-semibold">Vardiya düzeni</legend>
          <Field label="Gündüz başlangıç">
            <input className={inputCls} value={v.shift.dayStart} onChange={(e) => set("shift", { ...v.shift, dayStart: e.target.value })} />
          </Field>
          <Field label="Gece başlangıç">
            <input className={inputCls} value={v.shift.nightStart} onChange={(e) => set("shift", { ...v.shift, nightStart: e.target.value })} />
          </Field>
          <Field label="Fazla çalışma (sa/vardiya)">
            <input className={inputCls} type="number" value={v.shift.overtime} onChange={(e) => set("shift", { ...v.shift, overtime: Number(e.target.value) })} />
          </Field>
          <Field label="Blok uzunluğu (gün)" hint="Ör. 4: 4 gün gündüz, 4 gün gece, 4 gün izin">
            <input
              className={inputCls}
              type="number"
              min={1}
              value={v.shift.blockDays}
              onChange={(e) => set("shift", { ...v.shift, blockDays: Math.max(1, Number(e.target.value)) })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Dönüşüm başlangıç tarihi" hint="1. sürücünün gündüz bloğuna başladığı gün; aylar arası devamlılığı sağlar.">
              <input className={inputCls} type="date" value={v.shift.anchor} onChange={(e) => set("shift", { ...v.shift, anchor: e.target.value })} />
            </Field>
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold">Çalıştığı kurumlar</legend>
        <p className="text-xs text-muted">
          Araç birden fazla kurumda çalışabilir. Her kurumun puantajı kendi poz numarası, güzergâhı ve km zinciriyle
          hazırlanır; birinin çizelgesi diğerini etkilemez.
        </p>
        {value.assignments.map((a, i) => (
          <div key={a.id} className={`rounded-xl border border-line bg-ink/60 p-4 ${a.active ? "" : "opacity-60"}`}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select
                className={`${inputCls} w-auto font-medium`}
                value={a.clientId}
                onChange={(e) => setAssignment(i, { ...a, clientId: e.target.value })}
              >
                {clients
                  .filter((c) => c.id === a.clientId || !value.assignments.some((x) => x.clientId === c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={a.active} onChange={(e) => setAssignment(i, { ...a, active: e.target.checked })} />
                Bu kurumda aktif
              </label>
              <Button
                variant="danger"
                className="ml-auto px-2 py-1"
                onClick={() => onChange({ ...value, assignments: value.assignments.filter((_, j) => j !== i) })}
              >
                Kurumdan çıkar
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Poz ve sıra no">
                <input className={inputCls} value={a.poz} onChange={(e) => setAssignment(i, { ...a, poz: up(e.target.value) })} placeholder="S-29/62" />
              </Field>
              <div className="sm:col-span-3">
                <Field label="Göreve gidilen yer">
                  <input
                    className={inputCls}
                    value={a.route}
                    onChange={(e) => setAssignment(i, { ...a, route: up(e.target.value) })}
                    placeholder="DERBENT-İŞLETME-ADAPAZARI GİŞE"
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Çalıştığı günler" hint={v.layout === "vardiya" ? "Km bu günlere yazılır; vardiyalar her gün döner." : undefined}>
                  <select className={inputCls} value={a.schedule} onChange={(e) => setAssignment(i, { ...a, schedule: e.target.value as Schedule })}>
                    {Object.entries(SCHEDULE_LABELS).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Günlük km (en az)">
                <input className={inputCls} type="number" value={a.kmMin} onChange={(e) => setAssignment(i, { ...a, kmMin: Number(e.target.value) })} />
              </Field>
              <Field label="Günlük km (en çok)">
                <input className={inputCls} type="number" value={a.kmMax} onChange={(e) => setAssignment(i, { ...a, kmMax: Number(e.target.value) })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Son km (bu kurumun çizelgesinde)" hint="Bu kurumun bir sonraki puantajı bu km'den başlar; Excel indirilince güncellenir.">
                  <input className={inputCls} type="number" value={a.lastKm} onChange={(e) => setAssignment(i, { ...a, lastKm: Number(e.target.value) })} />
                </Field>
              </div>
            </div>
          </div>
        ))}
        {freeClients.length > 0 ? (
          <Button
            variant="secondary"
            onClick={() =>
              onChange({
                ...value,
                assignments: [...value.assignments, newAssignment({ vehicleId: v.id, clientId: freeClients[0].id })],
              })
            }
          >
            + Kurum ekle
          </Button>
        ) : (
          clients.length === 0 && <p className="text-xs text-muted">Önce Kurumlar sayfasından kurum ekleyin.</p>
        )}
      </fieldset>
    </div>
  );
}
