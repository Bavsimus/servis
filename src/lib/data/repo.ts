"use client";

import { supabase } from "@/lib/supabase/client";
import type {
  Client,
  DriverRecord,
  Organization,
  Role,
  TimesheetRecord,
  Vehicle,
  VehicleRecord,
} from "@/lib/puantaj/types";

/**
 * Tüm veri erişimi buradan geçer. Firma izolasyonu veritabanında RLS ile sağlanır;
 * buradaki org_id filtreleri yalnızca birden çok firmaya üye kullanıcı içindir.
 */

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// --- Firmalar ---------------------------------------------------------------

export async function listOrganizations(): Promise<Organization[]> {
  const { data: auth } = await supabase().auth.getUser();
  if (!auth.user) return [];
  const rows = check(
    await supabase().from("memberships").select("role, organizations(id, name)").eq("user_id", auth.user.id),
  ) as unknown as { role: Role; organizations: { id: string; name: string } }[];
  return rows
    .filter((r) => r.organizations)
    .map((r) => ({ id: r.organizations.id, name: r.organizations.name, role: r.role }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export async function createOrganization(name: string): Promise<string> {
  return check(await supabase().rpc("create_organization", { p_name: name })) as string;
}

export async function renameOrganization(id: string, name: string) {
  check(await supabase().from("organizations").update({ name }).eq("id", id));
}

export interface Member {
  userId: string;
  email: string;
  role: Role;
}

export async function listMembers(orgId: string): Promise<Member[]> {
  const rows = check(await supabase().rpc("org_members", { p_org: orgId })) as {
    user_id: string;
    email: string;
    role: Role;
  }[];
  return rows.map((r) => ({ userId: r.user_id, email: r.email, role: r.role }));
}

export async function addMember(orgId: string, email: string, role: "admin" | "member") {
  check(await supabase().rpc("add_member", { p_org: orgId, p_email: email, p_role: role }));
}

export async function removeMember(orgId: string, userId: string) {
  check(await supabase().from("memberships").delete().eq("org_id", orgId).eq("user_id", userId));
}

// --- Müşteri kurumlar -------------------------------------------------------

type ClientRow = { id: string; name: string; template_id: string; sheet_title: string; active: boolean };
const toClient = (r: ClientRow): Client => ({
  id: r.id,
  name: r.name,
  templateId: r.template_id,
  sheetTitle: r.sheet_title,
  active: r.active,
});

export async function listClients(orgId: string): Promise<Client[]> {
  const rows = check(await supabase().from("clients").select("*").eq("org_id", orgId).order("created_at")) as ClientRow[];
  return rows.map(toClient);
}

export async function saveClient(orgId: string, c: Partial<Client> & { name: string }) {
  const row = {
    org_id: orgId,
    name: c.name,
    template_id: c.templateId,
    sheet_title: c.sheetTitle,
    active: c.active,
  };
  if (c.id) check(await supabase().from("clients").update(row).eq("id", c.id));
  else check(await supabase().from("clients").insert(row));
}

export async function deleteClient(id: string) {
  check(await supabase().from("clients").delete().eq("id", id));
}

// --- Sürücüler --------------------------------------------------------------

export async function listDrivers(orgId: string): Promise<DriverRecord[]> {
  return check(
    await supabase().from("drivers").select("id, name, tc, phone, active").eq("org_id", orgId).order("name"),
  ) as DriverRecord[];
}

export async function saveDriver(orgId: string, d: Partial<DriverRecord> & { name: string }): Promise<string> {
  const row = { org_id: orgId, name: d.name.trim(), tc: d.tc ?? "", phone: d.phone ?? "", active: d.active ?? true };
  if (d.id) {
    check(await supabase().from("drivers").update(row).eq("id", d.id));
    return d.id;
  }
  return (check(await supabase().from("drivers").insert(row).select("id").single()) as { id: string }).id;
}

export async function deleteDriver(id: string) {
  check(await supabase().from("drivers").delete().eq("id", id));
}

// --- Araçlar ----------------------------------------------------------------

type VehicleRow = {
  id: string;
  client_id: string | null;
  position: number;
  active: boolean;
  plate: string;
  brand: string;
  kind: string;
  model_year: string;
  poz: string;
  layout: Vehicle["layout"];
  driver_ids: (string | null)[];
  route: string;
  schedule: Vehicle["schedule"];
  km_min: number;
  km_max: number;
  last_km: number;
  hours: Vehicle["hours"];
  shift: Vehicle["shift"];
};

const toVehicle = (r: VehicleRow): VehicleRecord => ({
  id: r.id,
  clientId: r.client_id,
  position: r.position,
  active: r.active,
  plate: r.plate,
  brand: r.brand,
  kind: r.kind,
  modelYear: r.model_year,
  poz: r.poz,
  layout: r.layout,
  driverIds: r.driver_ids.map((d) => d ?? ""),
  route: r.route,
  schedule: r.schedule,
  kmMin: r.km_min,
  kmMax: r.km_max,
  lastKm: r.last_km,
  hours: r.hours,
  shift: r.shift,
});

const fromVehicle = (orgId: string, v: VehicleRecord) => ({
  org_id: orgId,
  client_id: v.clientId,
  position: v.position,
  active: v.active,
  plate: v.plate.trim(),
  brand: v.brand,
  kind: v.kind,
  model_year: v.modelYear,
  poz: v.poz,
  layout: v.layout,
  driver_ids: v.driverIds.map((d) => d || null),
  route: v.route,
  schedule: v.schedule,
  km_min: v.kmMin,
  km_max: v.kmMax,
  last_km: v.lastKm,
  hours: v.hours,
  shift: v.shift,
});

export async function listVehicles(orgId: string): Promise<VehicleRecord[]> {
  const rows = check(
    await supabase().from("vehicles").select("*").eq("org_id", orgId).order("position").order("created_at"),
  ) as VehicleRow[];
  return rows.map(toVehicle);
}

/** Yeni araç eklenir (aynı plaka varsa hata), mevcut araç id'siyle güncellenir */
export async function saveVehicle(orgId: string, v: VehicleRecord, isNew: boolean) {
  const row = fromVehicle(orgId, v);
  if (isNew) check(await supabase().from("vehicles").insert(row));
  else check(await supabase().from("vehicles").update(row).eq("id", v.id));
}

export async function deleteVehicle(id: string) {
  check(await supabase().from("vehicles").delete().eq("id", id));
}

export async function setVehiclePositions(items: { id: string; position: number }[]) {
  await Promise.all(items.map((i) => supabase().from("vehicles").update({ position: i.position }).eq("id", i.id)));
}

export async function setLastKm(items: { id: string; lastKm: number }[]) {
  const results = await Promise.all(
    items.map((i) => supabase().from("vehicles").update({ last_km: i.lastKm }).eq("id", i.id)),
  );
  results.forEach((r) => check(r));
}

export async function setVehicleActive(id: string, active: boolean) {
  check(await supabase().from("vehicles").update({ active }).eq("id", id));
}

// --- Çizelgeler -------------------------------------------------------------

type TimesheetRow = {
  id: string;
  client_id: string;
  year: number;
  month: number;
  template_id: string;
  context: TimesheetRecord["context"];
  sheets: TimesheetRecord["sheets"];
  updated_at: string;
};

const toTimesheet = (r: TimesheetRow): TimesheetRecord => ({
  id: r.id,
  clientId: r.client_id,
  year: r.year,
  month: r.month,
  templateId: r.template_id,
  context: r.context,
  sheets: r.sheets,
  updatedAt: r.updated_at,
});

export async function listTimesheets(orgId: string, clientId: string): Promise<TimesheetRecord[]> {
  const rows = check(
    await supabase()
      .from("timesheets")
      .select("*")
      .eq("org_id", orgId)
      .eq("client_id", clientId)
      .order("year", { ascending: false })
      .order("month", { ascending: false }),
  ) as TimesheetRow[];
  return rows.map(toTimesheet);
}

export async function saveTimesheet(orgId: string, t: Omit<TimesheetRecord, "id" | "updatedAt">) {
  check(
    await supabase().from("timesheets").upsert(
      {
        org_id: orgId,
        client_id: t.clientId,
        year: t.year,
        month: t.month,
        template_id: t.templateId,
        context: t.context,
        sheets: t.sheets,
      },
      { onConflict: "client_id,year,month" },
    ),
  );
}

export async function deleteTimesheet(id: string) {
  check(await supabase().from("timesheets").delete().eq("id", id));
}

// --- Dışa aktarma -----------------------------------------------------------

export async function exportOrganization(orgId: string) {
  const [clients, drivers, vehicles] = await Promise.all([listClients(orgId), listDrivers(orgId), listVehicles(orgId)]);
  return JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), clients, drivers, vehicles }, null, 2);
}

/** Araç kaydını puantaj için sürücüleri çözülmüş anlık görüntüye çevirir */
export function resolveVehicle(v: VehicleRecord, drivers: DriverRecord[]): Vehicle {
  const byId = new Map(drivers.map((d) => [d.id, d]));
  const n = v.layout === "vardiya" ? 3 : 1;
  return {
    ...v,
    drivers: Array.from({ length: n }, (_, i) => {
      const d = byId.get(v.driverIds[i] ?? "");
      return d ? { name: d.name, tc: d.tc } : { name: "", tc: "" };
    }),
  };
}
