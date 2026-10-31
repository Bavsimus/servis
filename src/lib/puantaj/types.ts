export type LayoutKind = "tek" | "vardiya";

/** Aracın hangi günler çalıştığı */
export type Schedule = "hafta-ici" | "hafta-ici-cumartesi" | "her-gun";

export interface Driver {
  name: string;
  tc: string;
}

export interface Vehicle {
  id: string;
  active: boolean;
  plate: string;
  brand: string;
  kind: string; // CİNSİ: MİNİBÜS, KAMYONET, PANELVAN...
  modelYear: string;
  poz: string; // POZ VE SIRA NO
  layout: LayoutKind;
  /** tek: 1 sürücü, vardiya: 3 sürücü */
  drivers: Driver[];
  route: string; // GÖREVE GİDİLEN YER
  schedule: Schedule;
  kmMin: number;
  kmMax: number;
  /** Son puantajdaki gün sonu km; bir sonraki ay buradan başlar */
  lastKm: number;
  /** tek düzen: mesai saatleri yazılsın mı (kamyonet/otomobil çizelgelerinde dolu) */
  hours: { enabled: boolean; start: string; end: string; overtime: number };
  /** vardiya düzeni: 3 sürücü, gündüz/gece/izin dönüşümü */
  shift: {
    dayStart: string;
    nightStart: string;
    overtime: number;
    blockDays: number; // her vardiya tipinde kaç gün üst üste
    anchor: string; // dönüşümün başladığı tarih (yyyy-mm-dd), aylar arası süreklilik için
  };
}

export interface ShiftCell {
  start: string;
  end: string;
  overtime: number | string; // "UBGT" yazılabilir
}

export interface DayRow {
  day: number; // 1..31
  worked: boolean;
  km: number;
  route: string;
  /** tek düzen saatleri */
  hours?: ShiftCell | null;
  /** vardiya düzeni: sürücü başına (3 eleman), çalışmıyorsa null */
  shifts?: (ShiftCell | null)[];
}

export interface VehicleSheet {
  vehicle: Vehicle;
  startKm: number;
  rows: DayRow[];
}

export interface MonthContext {
  year: number;
  month: number; // 1..12
  /** Resmî tatil günleri (ayın günü -> ad) */
  holidays: Record<number, string>;
  signDate: string; // dd.mm.yyyy
  title: string; // sayfa başlığı (kurum adı)
}

// ---------------------------------------------------------------------------
// Veritabanı kayıtları (Supabase). Puantaj üretimi yukarıdaki Vehicle anlık
// görüntüsüyle çalışır; sürücüler kayıttan çözülerek araca gömülür.
// ---------------------------------------------------------------------------

export type Role = "owner" | "admin" | "member";

export interface Organization {
  id: string;
  name: string;
  role: Role;
}

/** Müşteri kurum: puantajın teslim edildiği yer ve onun çizelge formatı */
export interface Client {
  id: string;
  name: string;
  templateId: string;
  sheetTitle: string;
  active: boolean;
}

export interface DriverRecord {
  id: string;
  name: string;
  tc: string;
  phone: string;
  active: boolean;
}

/** Aracın kurumdan bağımsız bilgileri */
export type VehicleRecord = Pick<
  Vehicle,
  "id" | "active" | "plate" | "brand" | "kind" | "modelYear" | "layout" | "hours" | "shift"
> & {
  /** tek: 1, vardiya: 3 eleman; boş sürücü için "" */
  driverIds: string[];
};

/**
 * Aracın bir kurumdaki görevi. Aynı araç birden çok kurumda çalışabilir; her kurumun
 * puantajı kendi poz no, güzergâh, km aralığı ve km zinciriyle hazırlanır.
 */
export type Assignment = Pick<Vehicle, "poz" | "route" | "schedule" | "kmMin" | "kmMax" | "lastKm"> & {
  id: string;
  vehicleId: string;
  clientId: string;
  position: number;
  active: boolean;
};

export interface TimesheetRecord {
  id: string;
  clientId: string;
  year: number;
  month: number;
  templateId: string;
  context: MonthContext;
  sheets: VehicleSheet[];
  updatedAt: string;
}
