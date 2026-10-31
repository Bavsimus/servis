"use client";

import { DAY_NAMES_SHORT, isWeekend, weekday } from "@/lib/puantaj/calendar";
import { totals } from "@/lib/puantaj/generate";
import type { DayRow, MonthContext, ShiftCell, VehicleSheet } from "@/lib/puantaj/types";

const cellInput =
  "w-full min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm tabular-nums outline-none hover:border-line-strong focus:border-brand focus:bg-surface";

type ShiftKind = "gunduz" | "gece" | "izin";

function kindOf(s: ShiftCell | null | undefined, dayStart: string): ShiftKind {
  if (!s) return "izin";
  return s.start === dayStart ? "gunduz" : "gece";
}

/** Bir aracın aylık çizelgesini gün gün düzenleme tablosu */
export function SheetEditor({
  sheet,
  ctx,
  onChange,
}: {
  sheet: VehicleSheet;
  ctx: MonthContext;
  onChange: (s: VehicleSheet) => void;
}) {
  const v = sheet.vehicle;
  const t = totals(sheet, ctx);
  const setRow = (i: number, patch: Partial<DayRow>) =>
    onChange({ ...sheet, rows: sheet.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  let odo = sheet.startKm;
  const vardiya = v.layout === "vardiya";

  function setShift(i: number, driver: number, kind: ShiftKind) {
    const row = sheet.rows[i];
    const holiday = Boolean(ctx.holidays[row.day]);
    const { dayStart, nightStart, overtime } = v.shift;
    const ot = holiday ? "UBGT" : overtime;
    const cell: ShiftCell | null =
      kind === "izin"
        ? null
        : kind === "gunduz"
          ? { start: dayStart, end: nightStart, overtime: ot }
          : { start: nightStart, end: dayStart, overtime: ot };
    setRow(i, { shifts: (row.shifts ?? [null, null, null]).map((s, j) => (j === driver ? cell : s)) });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-4 text-sm">
        <label className="block">
          <span className="text-xs font-medium text-muted">Ay başı km</span>
          <input
            type="number"
            className="mt-1 block w-32 rounded-lg border border-line-strong px-2.5 py-1.5 tabular-nums"
            value={sheet.startKm}
            onChange={(e) => onChange({ ...sheet, startKm: Number(e.target.value) })}
          />
        </label>
        <Total label="Çalışılan gün" value={t.days} />
        <Total label="Toplam km" value={t.km.toLocaleString("tr-TR")} />
        <Total label="Ay sonu km" value={t.endKm.toLocaleString("tr-TR")} />
        {vardiya ? (
          <Total label="Fazla çalışma (sa)" value={t.overtime.join(" / ")} />
        ) : (
          v.hours.enabled && <Total label="Fazla çalışma (sa)" value={t.overtime[0]} />
        )}
        <Total label="UBGT" value={t.ubgtText || "—"} />
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-raised text-left text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Tarih</th>
              <th className="font-medium">Çalıştı</th>
              <th className="text-right font-medium">Gün başı</th>
              <th className="w-24 font-medium">Km</th>
              <th className="text-right font-medium">Gün sonu</th>
              {vardiya
                ? v.drivers.map((d, i) => (
                    <th key={i} className="px-2 font-medium" title={d.name}>
                      {d.name.split(" ")[0] || `${i + 1}. sürücü`}
                    </th>
                  ))
                : v.hours.enabled && (
                    <>
                      <th className="w-16 font-medium">Başlangıç</th>
                      <th className="w-16 font-medium">Bitiş</th>
                      <th className="w-14 font-medium">F.Ç.</th>
                    </>
                  )}
              <th className="px-3 font-medium">Göreve gidilen yer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sheet.rows.map((r, i) => {
              const start = odo;
              if (r.worked) odo += r.km;
              const wk = isWeekend(ctx.year, ctx.month, r.day);
              const hol = ctx.holidays[r.day];
              return (
                <tr key={r.day} className={hol ? "bg-rose-500/10" : wk ? "bg-amber-400/[0.05]" : ""}>
                  <td className="px-3 py-1 whitespace-nowrap tabular-nums">
                    {String(r.day).padStart(2, "0")}.{String(ctx.month).padStart(2, "0")}{" "}
                    <span className="text-xs text-muted">{DAY_NAMES_SHORT[weekday(ctx.year, ctx.month, r.day)]}</span>
                    {hol && <span className="ml-1 rounded bg-rose-500/20 px-1 text-[10px] text-rose-300" title={hol}>UBGT</span>}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={r.worked}
                      onChange={(e) =>
                        setRow(i, e.target.checked
                          ? {
                              worked: true,
                              km: r.km || Math.round((v.kmMin + v.kmMax) / 2),
                              route: r.route || v.route,
                              ...(!vardiya && v.hours.enabled ? { hours: { start: v.hours.start, end: v.hours.end, overtime: v.hours.overtime } } : {}),
                            }
                          : { worked: false, ...(!vardiya ? { hours: null } : {}) })
                      }
                    />
                  </td>
                  <td className="text-right tabular-nums text-muted">{r.worked ? start.toLocaleString("tr-TR") : ""}</td>
                  <td>
                    {r.worked && (
                      <input type="number" className={cellInput} value={r.km} onChange={(e) => setRow(i, { km: Number(e.target.value) })} />
                    )}
                  </td>
                  <td className="text-right tabular-nums text-muted">{r.worked ? odo.toLocaleString("tr-TR") : ""}</td>
                  {vardiya
                    ? [0, 1, 2].map((d) => {
                        const kind = kindOf(r.shifts?.[d], v.shift.dayStart);
                        return (
                          <td key={d} className="px-1">
                            <select
                              value={kind}
                              onChange={(e) => setShift(i, d, e.target.value as ShiftKind)}
                              className={`rounded px-1 py-0.5 text-xs ${kind === "gunduz" ? "bg-sky-500/15 text-sky-300" : kind === "gece" ? "bg-indigo-500/30 text-white" : "bg-transparent text-subtle"}`}
                            >
                              <option value="gunduz">Gündüz</option>
                              <option value="gece">Gece</option>
                              <option value="izin">İzin</option>
                            </select>
                          </td>
                        );
                      })
                    : v.hours.enabled && (
                        <>
                          {(["start", "end", "overtime"] as const).map((k) => (
                            <td key={k}>
                              {r.hours && (
                                <input
                                  className={cellInput}
                                  value={r.hours[k]}
                                  onChange={(e) =>
                                    setRow(i, {
                                      hours: {
                                        ...r.hours!,
                                        [k]: k === "overtime" && /^\d+(\.\d+)?$/.test(e.target.value) ? Number(e.target.value) : e.target.value,
                                      },
                                    })
                                  }
                                />
                              )}
                            </td>
                          ))}
                        </>
                      )}
                  <td className="px-2">
                    {r.worked && <input className={cellInput} value={r.route} onChange={(e) => setRow(i, { route: e.target.value })} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Total({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}
