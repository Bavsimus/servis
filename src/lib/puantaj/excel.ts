import type ExcelJS from "exceljs";
import { isWeekend, MONTHS_TR } from "./calendar";
import { totals } from "./generate";
import type { BlockLayout, PuantajTemplate, TemplateLayout } from "./templates";
import type { MonthContext, ShiftCell, VehicleSheet } from "./types";

type Style = Partial<ExcelJS.Style>;

/** Satır içindeki veri hücrelerinin sütunları (kurum şablonuna göre) */
const COLS = {
  tek: {
    head: { plate: "A", brand: "C", kind: "I", year: "K", name: "P", tc: "AA", poz: "AK", month: "AM" },
    day: { date: "A", startKm: "C", endKm: "I", km: "K", hStart: "P", hEnd: "T", hOt: "W", route: "AF" },
    foot: { row: 36, days: "G", km: "K", ot: "W", ubgt: "AF" },
    sign: { row: 38, cols: ["A", "E", "L", "Y"], labels: ["ŞOFÖR", "YÜKLENİCİ", "İŞLETEN", "KONTROL EDEN"] },
  },
  vardiya: {
    head: { plate: "A", brand: "B", kind: "F", year: "I", poz: "AG", month: "AL", names: ["J", "R", "Z"] },
    day: { date: "A", startKm: "B", endKm: "F", km: "I", shifts: [["J", "K", "N"], ["R", "U", "W"], ["Z", "AC", "AD"]], route: "AJ" },
    foot: { row: 37, days: "D", km: "I", ots: ["N", "W", "AD"], ubgt: "AJ" },
    sign: { row: 39, cols: ["A", "I", "AH"] },
  },
} as const;

const asNumber = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : v);

/**
 * Şablona göre çalışma çizelgesi oluşturur.
 * loadImage, şablonun logo dosyasını getirir: yol "<sablon_id>/<dosya>" (public/sablonlar altında).
 */
export async function buildWorkbook(
  sheets: VehicleSheet[],
  ctx: MonthContext,
  template: PuantajTemplate,
  loadImage: (path: string) => Promise<ArrayBuffer>,
): Promise<ArrayBuffer> {
  const L = template.layout;
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  wb.creator = "Servis Paneli";
  const title = ctx.title || template.defaultTitle;
  const ws = wb.addWorksheet(MONTHS_TR[ctx.month - 1], {
    pageSetup: {
      paperSize: L.page.paperSize,
      orientation: L.page.orientation,
      margins: L.page.margins,
      horizontalCentered: true,
    },
    views: [{ showGridLines: false }],
  });
  L.columns.forEach((w, i) => {
    if (w) ws.getColumn(i + 1).width = w;
  });

  const imageIds = new Map<string, number>();
  for (const block of Object.values(L.layouts)) {
    for (const im of block.images) {
      if (!imageIds.has(im.file)) {
        const buffer = await loadImage(`${template.id}/${im.file}`);
        imageIds.set(
          im.file,
          wb.addImage({ buffer, extension: im.ext === "jpg" ? "jpeg" : (im.ext as "png") }),
        );
      }
    }
  }

  let top = 1;
  for (const sheet of sheets) {
    const kind = sheet.vehicle.layout;
    const block = L.layouts[kind];
    writeBlock(ws, L, top, block, sheet, { ...ctx, title }, imageIds);
    top += block.rows;
    ws.getRow(top - 1).addPageBreak();
  }
  // Tablonun dışındaki sütunlar (AP+) yazdırılmasın
  ws.pageSetup.printArea = `A1:AO${top - 1}`;
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

function writeBlock(
  ws: ExcelJS.Worksheet,
  L: TemplateLayout,
  top: number,
  block: BlockLayout,
  sheet: VehicleSheet,
  ctx: MonthContext,
  imageIds: Map<string, number>,
) {
  const kind = sheet.vehicle.layout;
  const style = (i: number): Style => structuredClone(L.styles[i]);
  const cell = (r: number, col: string) => ws.getCell(`${col}${top + r}`);

  // Önce birleştirme, sonra stil: ExcelJS birleştirirken ana hücre stilini kopyalıyor
  for (const [r1, c1, r2, c2] of block.merges) ws.mergeCells(top + r1, c1, top + r2, c2);

  block.heights.forEach((h, i) => {
    if (h) ws.getRow(top + i).height = h;
  });

  for (const [r, row] of Object.entries(block.cells)) {
    for (const [col, c] of Object.entries(row)) {
      const target = cell(Number(r), col);
      target.style = style(c.s);
      if (c.v !== undefined) target.value = c.v;
    }
  }
  cell(0, "A").value = ctx.title;

  const v = sheet.vehicle;
  const monthText = `${MONTHS_TR[ctx.month - 1]} ${ctx.year}`;
  const t = totals(sheet, ctx);

  if (kind === "tek") {
    const C = COLS.tek;
    const h = C.head;
    const d = v.drivers[0] ?? { name: "", tc: "" };
    cell(3, h.plate).value = v.plate;
    cell(3, h.brand).value = v.brand;
    cell(3, h.kind).value = v.kind;
    cell(3, h.year).value = asNumber(v.modelYear);
    cell(3, h.name).value = d.name;
    cell(3, h.tc).value = asNumber(d.tc);
    cell(3, h.poz).value = v.poz;
    cell(3, h.month).value = monthText;
  } else {
    const C = COLS.vardiya;
    const h = C.head;
    cell(3, h.plate).value = v.plate;
    cell(3, h.brand).value = v.brand;
    cell(3, h.kind).value = v.kind;
    cell(3, h.year).value = asNumber(v.modelYear);
    h.names.forEach((col, i) => {
      cell(3, col).value = v.drivers[i]?.name ?? "";
      cell(4, col).value = asNumber(v.drivers[i]?.tc ?? "");
    });
    cell(3, h.poz).value = v.poz;
    cell(3, h.month).value = monthText;
  }

  // Gün satırları
  const D = COLS[kind].day;
  let prevEnd: string | null = null;
  let odometer = sheet.startKm;
  for (let i = 0; i < 31; i++) {
    const r = block.dayRow + i;
    const rowData = sheet.rows[i];
    const weekend = rowData ? isWeekend(ctx.year, ctx.month, rowData.day) : false;
    const styles = weekend ? block.weekend : block.weekday;
    for (const [col, s] of Object.entries(styles)) cell(r, col).style = style(s);
    if (!rowData) continue;

    cell(r, D.date).value = new Date(Date.UTC(ctx.year, ctx.month - 1, rowData.day));
    if (rowData.worked) {
      const startRef = `${D.startKm}${top + r}`;
      const kmRef = `${D.km}${top + r}`;
      cell(r, D.startKm).value = prevEnd
        ? { formula: prevEnd, result: odometer }
        : odometer;
      cell(r, D.km).value = rowData.km;
      odometer += rowData.km;
      cell(r, D.endKm).value = { formula: `SUM(${startRef},${kmRef})`, result: odometer };
      prevEnd = `${D.endKm}${top + r}`;
      cell(r, D.route).value = rowData.route;
    }
    if (kind === "tek" && rowData.hours) {
      const c = COLS.tek.day;
      writeShift(cell(r, c.hStart), cell(r, c.hEnd), cell(r, c.hOt), rowData.hours);
    }
    if (kind === "vardiya") {
      COLS.vardiya.day.shifts.forEach(([a, b, o], k) => {
        const s = rowData.shifts?.[k];
        if (s) writeShift(cell(r, a), cell(r, b), cell(r, o), s);
      });
    }
  }

  // Alt toplamlar
  const first = top + block.dayRow;
  const last = first + 30;
  if (kind === "tek") {
    const F = COLS.tek.foot;
    cell(F.row, F.days).value = t.days;
    cell(F.row, F.km).value = { formula: `SUM(K${first}:O${last})`, result: t.km };
    if (v.hours.enabled) cell(F.row, F.ot).value = { formula: `SUM(W${first}:Z${last})`, result: t.overtime[0] };
    cell(F.row, F.ubgt).value = t.ubgtText;
    const S = COLS.tek.sign;
    S.cols.forEach((col, i) => {
      cell(S.row, col).value = `${ctx.signDate}\n${S.labels[i]}`;
    });
  } else {
    const F = COLS.vardiya.foot;
    cell(F.row, F.days).value = t.days;
    cell(F.row, F.km).value = { formula: `SUM(I${first}:I${last})`, result: t.km };
    F.ots.forEach((col, i) => {
      const end = col === "N" ? "Q" : col === "W" ? "Y" : "AF";
      cell(F.row, col).value = { formula: `SUM(${col}${first}:${end}${last})`, result: t.overtime[i] };
    });
    cell(F.row, F.ubgt).value = t.ubgtText;
    for (const col of COLS.vardiya.sign.cols) cell(COLS.vardiya.sign.row, col).value = ctx.signDate;
  }

  for (const im of block.images) {
    ws.addImage(imageIds.get(im.file)!, {
      tl: { nativeCol: im.col, nativeColOff: im.colOff, nativeRow: top - 1 + im.row, nativeRowOff: im.rowOff },
      ext: { width: im.width, height: im.height },
      editAs: "oneCell",
    } as unknown as ExcelJS.ImagePosition);
  }
}

function writeShift(a: ExcelJS.Cell, b: ExcelJS.Cell, o: ExcelJS.Cell, s: ShiftCell) {
  a.value = asNumber(s.start);
  b.value = asNumber(s.end);
  o.value = s.overtime;
}
