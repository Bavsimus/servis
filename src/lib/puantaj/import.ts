import type ExcelJS from "exceljs";
import { newVehicle } from "./defaults";
import type { Schedule, Vehicle } from "./types";

/** Hücre değerini düz değere çevirir (formül sonucu, zengin metin, tarih) */
function plain(v: ExcelJS.CellValue): string | number | Date | null {
  if (v == null) return null;
  if (v instanceof Date || typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return String(v);
  if ("result" in v) return plain(v.result as ExcelJS.CellValue);
  if ("richText" in v) return v.richText.map((t) => t.text).join("");
  if ("text" in v) return String(v.text);
  return null;
}

const text = (v: unknown) => (v == null ? "" : v instanceof Date ? "" : String(v).trim());
const numeric = (v: unknown) => (typeof v === "number" ? v : Number(String(v ?? "").replace(",", ".")));

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

export interface ImportResult {
  sheetName: string;
  sheetNames: string[];
  vehicles: Vehicle[];
  /** Her aracın bloğundaki "AİT OLDUĞU AY / YIL" değeri (güncel olmayan blokları fark etmek için) */
  months: string[];
}

/** Kurumun puantaj Excel'inden araç, sürücü ve son km bilgilerini okur */
export async function importPuantaj(buffer: ArrayBuffer, sheetName?: string): Promise<ImportResult> {
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  await wb.xlsx.load(buffer);
  const sheetNames = wb.worksheets.map((w) => w.name);
  const ws = (sheetName && wb.getWorksheet(sheetName)) || wb.worksheets[wb.worksheets.length - 1];
  const get = (r: number, col: string) => plain(ws.getCell(`${col}${r}`).value);

  const vehicles: Vehicle[] = [];
  const months: string[] = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const head = get(r, "A");
    if (typeof head !== "string" || !head.startsWith("T.C.")) continue;
    const vardiya = text(get(r + 1, "J")).startsWith("SÜRÜCÜ");
    const h = r + 3;
    const plate = text(get(h, "A"));
    if (!plate) continue;

    const dayStart = vardiya ? r + 6 : r + 5;
    const col = vardiya
      ? { km: "I", end: "F", route: "AJ", hour: "J" }
      : { km: "K", end: "I", route: "AF", hour: "P" };
    const kms: number[] = [];
    const routes: string[] = [];
    let lastKm = 0;
    let weekendWork = false;
    let saturdayOnly = true;
    let hoursUsed = false;
    for (let i = 0; i < 31; i++) {
      const row = dayStart + i;
      const date = get(row, "A");
      const km = numeric(get(row, col.km));
      if (km > 0) {
        kms.push(km);
        const end = numeric(get(row, col.end));
        if (end > lastKm) lastKm = end;
        if (date instanceof Date) {
          const w = date.getUTCDay();
          if (w === 0 || w === 6) weekendWork = true;
          if (w === 0) saturdayOnly = false;
        }
      }
      routes.push(text(get(row, col.route)));
      if (!vardiya && get(row, col.hour) != null) hoursUsed = true;
    }
    const schedule: Schedule = weekendWork ? (saturdayOnly ? "hafta-ici-cumartesi" : "her-gun") : "hafta-ici";
    const sorted = [...kms].sort((a, b) => a - b);
    // Uç değerleri (ay sonu düzeltmeleri vb.) dışarıda bırak
    const trimmed = sorted.length > 4 ? sorted.slice(1, -1) : sorted;

    const month = get(h, vardiya ? "AL" : "AM");
    months.push(
      month instanceof Date
        ? month.toLocaleDateString("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" }).toLocaleUpperCase("tr-TR")
        : text(month),
    );
    vehicles.push(
      newVehicle({
        plate,
        brand: text(get(h, vardiya ? "B" : "C")),
        kind: text(get(h, vardiya ? "F" : "I")),
        modelYear: text(get(h, vardiya ? "I" : "K")),
        poz: text(get(h, vardiya ? "AG" : "AK")),
        layout: vardiya ? "vardiya" : "tek",
        drivers: vardiya
          ? ["J", "R", "Z"].map((c) => ({ name: text(get(h, c)), tc: text(get(h + 1, c)) }))
          : [{ name: text(get(h, "P")), tc: text(get(h, "AA")) }],
        route: mostCommon(routes),
        schedule,
        kmMin: trimmed[0] ?? 195,
        kmMax: trimmed[trimmed.length - 1] ?? 200,
        lastKm,
        hours: {
          enabled: hoursUsed,
          start: text(get(dayStart, "P")) || "7",
          end: text(get(dayStart, "T")) || "18",
          overtime: numeric(get(dayStart, "W")) || 1,
        },
      }),
    );
  }
  return { sheetName: ws.name, sheetNames, vehicles, months };
}
