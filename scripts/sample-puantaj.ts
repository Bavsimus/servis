/** Örnek (hayali) verilerle puantaj üretir: npx tsx scripts/sample-puantaj.ts cikti.xlsx */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSheet } from "../src/lib/puantaj/generate";
import { buildWorkbook } from "../src/lib/puantaj/excel";
import { getTemplate } from "../src/lib/puantaj/templates";
import { holidaysOf, lastDayString } from "../src/lib/puantaj/calendar";
import { newVehicle } from "../src/lib/puantaj/defaults";

const [year, month] = [2026, 10];
const ctx = { year, month, holidays: holidaysOf(year, month), signDate: lastDayString(year, month), title: "" };
const vehicles = [
  newVehicle({ plate: "41 XX 001", brand: "MERCEDES", kind: "MİNİBÜS", modelYear: "2024", poz: "S-1/1", drivers: [{ name: "ÖRNEK SÜRÜCÜ", tc: "11111111111" }], route: "MERKEZ-İŞLETME", kmMin: 195, kmMax: 200, lastKm: 80322 }),
  newVehicle({ plate: "41 XX 002", brand: "MERCEDES", kind: "MİNİBÜS", modelYear: "2023", poz: "S-2/2", drivers: [{ name: "İKİNCİ SÜRÜCÜ", tc: "22222222222" }], route: "GEBZE-İŞLETME-GEBZE", schedule: "her-gun", lastKm: 1000 }),
  newVehicle({ plate: "34 XX 003", brand: "FIAT", kind: "KAMYONET", modelYear: "2022", poz: "K-5/54", drivers: [{ name: "ÜÇÜNCÜ SÜRÜCÜ", tc: "33333333333" }], hours: { enabled: true, start: "7", end: "18", overtime: 1 }, lastKm: 500 }),
  newVehicle({ plate: "34 XX 004", brand: "FORD", kind: "PANELVAN", modelYear: "2026", poz: "K-9/79", layout: "vardiya", drivers: [{ name: "SÜRÜCÜ A", tc: "44444444444" }, { name: "SÜRÜCÜ B", tc: "55555555555" }, { name: "SÜRÜCÜ C", tc: "66666666666" }], route: "İŞLETME", lastKm: 100 }),
];
async function main() {
const buf = await buildWorkbook(vehicles.map((v) => buildSheet(v, ctx)), ctx, getTemplate("kgm-kiralik-arac"), (f: string) =>
  readFile(path.join("public/sablonlar", f)).then((b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer),
);
await writeFile(process.argv[2] ?? "ornek-puantaj.xlsx", Buffer.from(buf));
console.log("yazıldı");
}
main();
