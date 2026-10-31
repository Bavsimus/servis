import { daysInMonth, isWeekend, weekday, MONTHS_TR } from "./calendar";
import type { DayRow, MonthContext, ShiftCell, Vehicle, VehicleSheet } from "./types";

/** Aynı araç + ay için her seferinde aynı km dizisini veren tohumlu rastgele sayı üreteci */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function worksOn(vehicle: Vehicle, ctx: MonthContext, day: number) {
  const w = weekday(ctx.year, ctx.month, day);
  if (vehicle.schedule === "her-gun") return true;
  if (ctx.holidays[day]) return false;
  if (vehicle.schedule === "hafta-ici-cumartesi") return w !== 0;
  return w !== 0 && w !== 6;
}

const DAY_MS = 86_400_000;

/** Vardiya düzeninde sürücünün o günkü durumu: gündüz, gece ya da izin */
export function shiftOf(vehicle: Vehicle, ctx: MonthContext, day: number, driver: number) {
  const { blockDays: b, anchor } = vehicle.shift;
  const [y, m, d] = anchor.split("-").map(Number);
  const index = Math.round(
    (Date.UTC(ctx.year, ctx.month - 1, day) - Date.UTC(y, m - 1, d)) / DAY_MS,
  );
  const cycle = 3 * b;
  const p = (((index + driver * b) % cycle) + cycle) % cycle;
  return p < b ? "gunduz" : p < 2 * b ? "gece" : "izin";
}

function shiftCell(vehicle: Vehicle, kind: string, holiday: boolean): ShiftCell | null {
  const { dayStart, nightStart, overtime } = vehicle.shift;
  if (kind === "izin") return null;
  const ot = holiday ? "UBGT" : overtime;
  return kind === "gunduz"
    ? { start: dayStart, end: nightStart, overtime: ot }
    : { start: nightStart, end: dayStart, overtime: ot };
}

export function buildSheet(vehicle: Vehicle, ctx: MonthContext, salt: number | string = 0): VehicleSheet {
  const rand = rng(`${vehicle.plate}|${ctx.year}-${ctx.month}|${salt}`);
  const lo = Math.min(vehicle.kmMin, vehicle.kmMax);
  const hi = Math.max(vehicle.kmMin, vehicle.kmMax);
  const rows: DayRow[] = [];
  for (let day = 1; day <= daysInMonth(ctx.year, ctx.month); day++) {
    const worked = worksOn(vehicle, ctx, day);
    const row: DayRow = {
      day,
      worked,
      km: worked ? lo + Math.floor(rand() * (hi - lo + 1)) : 0,
      route: worked ? vehicle.route : "",
    };
    if (vehicle.layout === "tek") {
      const h = vehicle.hours;
      row.hours = worked && h.enabled ? { start: h.start, end: h.end, overtime: h.overtime } : null;
    } else {
      const holiday = Boolean(ctx.holidays[day]);
      row.shifts = [0, 1, 2].map((i) => shiftCell(vehicle, shiftOf(vehicle, ctx, day, i), holiday));
    }
    rows.push(row);
  }
  return { vehicle, startKm: vehicle.lastKm, rows };
}

export interface SheetTotals {
  days: number;
  km: number;
  endKm: number;
  overtime: number[]; // tek: [toplam], vardiya: sürücü başına
  ubgtDays: number[];
  ubgtText: string;
}

const num = (v: number | string | undefined) => (typeof v === "number" ? v : 0);

export function totals(sheet: VehicleSheet, ctx: MonthContext): SheetTotals {
  const worked = sheet.rows.filter((r) => r.worked);
  const km = worked.reduce((s, r) => s + r.km, 0);
  const isVardiya = sheet.vehicle.layout === "vardiya";
  const overtime = isVardiya
    ? [0, 1, 2].map((i) => sheet.rows.reduce((s, r) => s + num(r.shifts?.[i]?.overtime), 0))
    : [sheet.rows.reduce((s, r) => s + num(r.hours?.overtime), 0)];
  // UBGT: resmî tatilde çalışılan günler (vardiyada en az bir sürücü görevdeyse)
  const ubgtDays = sheet.rows
    .filter((r) => ctx.holidays[r.day])
    .filter((r) => (isVardiya ? r.shifts?.some(Boolean) : r.worked))
    .map((r) => r.day);
  const monthName = MONTHS_TR[ctx.month - 1];
  const ubgtText = ubgtDays.length
    ? `${ubgtDays.length} - (${ubgtDays.map((d) => `${d} ${monthName}`).join(", ")})`
    : "";
  return {
    days: worked.length,
    km,
    endKm: sheet.startKm + km,
    overtime,
    ubgtDays,
    ubgtText,
  };
}

export { isWeekend };
