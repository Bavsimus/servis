"use client";

import { withLayout } from "@/lib/puantaj/defaults";
import type { Client, DriverRecord, Schedule, VehicleRecord as Vehicle } from "@/lib/puantaj/types";
import { Field, inputCls } from "./ui";

export const SCHEDULE_LABELS: Record<Schedule, string> = {
  "hafta-ici": "Hafta içi (tatiller hariç)",
  "hafta-ici-cumartesi": "Hafta içi + Cumartesi",
  "her-gun": "Her gün (tatiller dahil)",
};

export function VehicleForm({
  value,
  onChange,
  drivers,
  clients,
}: {
  value: Vehicle;
  onChange: (v: Vehicle) => void;
  drivers: DriverRecord[];
  clients: Client[];
}) {
  const set = <K extends keyof Vehicle>(k: K, v: Vehicle[K]) => onChange({ ...value, [k]: v });
  const up = (s: string) => s.toLocaleUpperCase("tr-TR");

  return (
    <div className="space-y-6">
      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold">Araç</legend>
        <Field label="Plaka">
          <input className={inputCls} value={value.plate} onChange={(e) => set("plate", up(e.target.value))} placeholder="41 P 1234" />
        </Field>
        <Field label="Marka / model">
          <input className={inputCls} value={value.brand} onChange={(e) => set("brand", up(e.target.value))} />
        </Field>
        <Field label="Cinsi">
          <input className={inputCls} list="kinds" value={value.kind} onChange={(e) => set("kind", up(e.target.value))} />
          <datalist id="kinds">
            {["MİNİBÜS", "MİDİBÜS", "KAMYONET", "PANELVAN", "OTOMOBİL"].map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </Field>
        <Field label="Model yılı">
          <input className={inputCls} inputMode="numeric" value={value.modelYear} onChange={(e) => set("modelYear", e.target.value)} />
        </Field>
        <Field label="Poz ve sıra no">
          <input className={inputCls} value={value.poz} onChange={(e) => set("poz", up(e.target.value))} placeholder="S-29/62" />
        </Field>
        <Field label="Çizelge tipi">
          <select className={inputCls} value={value.layout} onChange={(e) => onChange(withLayout(value, e.target.value as Vehicle["layout"]))}>
            <option value="tek">Tek sürücü</option>
            <option value="vardiya">3 sürücü, gündüz/gece vardiya</option>
          </select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold">Kurum ve sürücü{value.driverIds.length > 1 ? "ler" : ""}</legend>
        <Field label="Çalıştığı kurum">
          <select className={inputCls} value={value.clientId ?? ""} onChange={(e) => set("clientId", e.target.value || null)}>
            <option value="">Seçilmedi</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {value.driverIds.map((id, i) => (
          <Field key={i} label={value.driverIds.length > 1 ? `${i + 1}. sürücü` : "Sürücü"}>
            <select
              className={inputCls}
              value={id}
              onChange={(e) => set("driverIds", value.driverIds.map((x, j) => (j === i ? e.target.value : x)))}
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
        {drivers.length === 0 && (
          <p className="text-xs text-muted sm:col-span-3">Önce Sürücüler sayfasından sürücü ekleyin.</p>
        )}
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-4">
        <legend className="mb-2 text-sm font-semibold">Çalışma ve km</legend>
        <div className="sm:col-span-2">
          <Field label="Göreve gidilen yer">
            <input className={inputCls} value={value.route} onChange={(e) => set("route", up(e.target.value))} placeholder="DERBENT-İŞLETME-ADAPAZARI GİŞE" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Çalıştığı günler" hint={value.layout === "vardiya" ? "Km bu günlere yazılır; vardiyalar her gün döner." : undefined}>
            <select className={inputCls} value={value.schedule} onChange={(e) => set("schedule", e.target.value as Schedule)}>
              {Object.entries(SCHEDULE_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Günlük km (en az)">
          <input className={inputCls} type="number" value={value.kmMin} onChange={(e) => set("kmMin", Number(e.target.value))} />
        </Field>
        <Field label="Günlük km (en çok)">
          <input className={inputCls} type="number" value={value.kmMax} onChange={(e) => set("kmMax", Number(e.target.value))} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Son km (gösterge)" hint="Bir sonraki puantaj bu km'den başlar. Excel indirilince otomatik güncellenir.">
            <input className={inputCls} type="number" value={value.lastKm} onChange={(e) => set("lastKm", Number(e.target.value))} />
          </Field>
        </div>
      </fieldset>

      {value.layout === "tek" ? (
        <fieldset className="grid gap-3 sm:grid-cols-4">
          <legend className="mb-2 text-sm font-semibold">Mesai saatleri</legend>
          <label className="flex items-center gap-2 text-sm sm:col-span-4">
            <input type="checkbox" checked={value.hours.enabled} onChange={(e) => set("hours", { ...value.hours, enabled: e.target.checked })} />
            Gün başı / gün sonu saatleri ve fazla çalışma yazılsın
          </label>
          {value.hours.enabled && (
            <>
              <Field label="Gün başı (sa)">
                <input className={inputCls} value={value.hours.start} onChange={(e) => set("hours", { ...value.hours, start: e.target.value })} />
              </Field>
              <Field label="Gün sonu (sa)">
                <input className={inputCls} value={value.hours.end} onChange={(e) => set("hours", { ...value.hours, end: e.target.value })} />
              </Field>
              <Field label="Fazla çalışma (sa/gün)">
                <input className={inputCls} type="number" value={value.hours.overtime} onChange={(e) => set("hours", { ...value.hours, overtime: Number(e.target.value) })} />
              </Field>
            </>
          )}
        </fieldset>
      ) : (
        <fieldset className="grid gap-3 sm:grid-cols-4">
          <legend className="mb-2 text-sm font-semibold">Vardiya düzeni</legend>
          <Field label="Gündüz başlangıç">
            <input className={inputCls} value={value.shift.dayStart} onChange={(e) => set("shift", { ...value.shift, dayStart: e.target.value })} />
          </Field>
          <Field label="Gece başlangıç">
            <input className={inputCls} value={value.shift.nightStart} onChange={(e) => set("shift", { ...value.shift, nightStart: e.target.value })} />
          </Field>
          <Field label="Fazla çalışma (sa/vardiya)">
            <input className={inputCls} type="number" value={value.shift.overtime} onChange={(e) => set("shift", { ...value.shift, overtime: Number(e.target.value) })} />
          </Field>
          <Field label="Blok uzunluğu (gün)" hint="Ör. 4: 4 gün gündüz, 4 gün gece, 4 gün izin">
            <input className={inputCls} type="number" min={1} value={value.shift.blockDays} onChange={(e) => set("shift", { ...value.shift, blockDays: Math.max(1, Number(e.target.value)) })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Dönüşüm başlangıç tarihi" hint="1. sürücünün gündüz bloğuna başladığı gün; aylar arası devamlılığı sağlar.">
              <input className={inputCls} type="date" value={value.shift.anchor} onChange={(e) => set("shift", { ...value.shift, anchor: e.target.value })} />
            </Field>
          </div>
        </fieldset>
      )}
    </div>
  );
}
