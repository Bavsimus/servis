import type { Assignment, Vehicle, VehicleRecord } from "./types";

export function newId() {
  return crypto.randomUUID();
}

const BASE: Omit<Vehicle, "id" | "drivers"> = {
  active: true,
  plate: "",
  brand: "",
  kind: "MİNİBÜS",
  modelYear: "",
  poz: "",
  layout: "tek",
  route: "",
  schedule: "hafta-ici",
  kmMin: 195,
  kmMax: 200,
  lastKm: 0,
  hours: { enabled: false, start: "7", end: "18", overtime: 1 },
  shift: { dayStart: "06:30", nightStart: "18:30", overtime: 1, blockDays: 4, anchor: "2026-01-01" },
};

/** Puantaj üretimi için sürücüleri gömülü araç (içe aktarma ve örnekler) */
export function newVehicle(partial: Partial<Vehicle> = {}): Vehicle {
  const layout = partial.layout ?? "tek";
  return {
    ...BASE,
    id: newId(),
    kind: layout === "vardiya" ? "PANELVAN" : BASE.kind,
    drivers: Array.from({ length: layout === "vardiya" ? 3 : 1 }, () => ({ name: "", tc: "" })),
    ...partial,
  };
}

/** Veritabanına kaydedilecek yeni araç kaydı */
export function newVehicleRecord(partial: Partial<VehicleRecord> = {}): VehicleRecord {
  const { active, plate, brand, kind, modelYear, layout, hours, shift } = BASE;
  return { id: newId(), active, plate, brand, kind, modelYear, layout, hours, shift, driverIds: [""], ...partial };
}

/** Aracın bir kurumdaki yeni görevi */
export function newAssignment(partial: Partial<Assignment> & Pick<Assignment, "vehicleId" | "clientId">): Assignment {
  const { poz, route, schedule, kmMin, kmMax, lastKm } = BASE;
  return { id: newId(), position: 0, active: true, poz, route, schedule, kmMin, kmMax, lastKm, ...partial };
}

/** Düzen değişince sürücü sayısını 1 / 3'e tamamlar */
export function withLayout(v: VehicleRecord, layout: Vehicle["layout"]): VehicleRecord {
  const n = layout === "vardiya" ? 3 : 1;
  const driverIds = Array.from({ length: n }, (_, i) => v.driverIds[i] ?? "");
  return { ...v, layout, driverIds };
}
