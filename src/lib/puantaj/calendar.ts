export const MONTHS_TR = [
  "OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN",
  "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK",
];

/** Sabit tarihli resmî tatiller (ay-gün) */
const FIXED: Record<string, string> = {
  "01-01": "Yılbaşı",
  "04-23": "Ulusal Egemenlik ve Çocuk Bayramı",
  "05-01": "Emek ve Dayanışma Günü",
  "05-19": "Atatürk'ü Anma, Gençlik ve Spor Bayramı",
  "07-15": "Demokrasi ve Millî Birlik Günü",
  "08-30": "Zafer Bayramı",
  "10-29": "Cumhuriyet Bayramı",
};

/**
 * Dinî bayramlar her yıl değişir. Diyanet takvimine göre buraya eklenir;
 * puantaj ekranında da elle açılıp kapatılabilir.
 */
const RELIGIOUS: Record<string, string> = {
  "2026-03-20": "Ramazan Bayramı 1. gün",
  "2026-03-21": "Ramazan Bayramı 2. gün",
  "2026-03-22": "Ramazan Bayramı 3. gün",
  "2026-05-27": "Kurban Bayramı 1. gün",
  "2026-05-28": "Kurban Bayramı 2. gün",
  "2026-05-29": "Kurban Bayramı 3. gün",
  "2026-05-30": "Kurban Bayramı 4. gün",
  // 2027 tarihleri Diyanet takvimi kesinleşince eklenecek
};

const pad = (n: number) => String(n).padStart(2, "0");

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/** 0 = Pazar ... 6 = Cumartesi */
export function weekday(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay();
}

export function isWeekend(year: number, month: number, day: number) {
  const w = weekday(year, month, day);
  return w === 0 || w === 6;
}

export function holidaysOf(year: number, month: number): Record<number, string> {
  const out: Record<number, string> = {};
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const md = `${pad(month)}-${pad(d)}`;
    const name = FIXED[md] ?? RELIGIOUS[`${year}-${md}`];
    if (name) out[d] = name;
  }
  return out;
}

export function formatDate(year: number, month: number, day: number) {
  return `${pad(day)}.${pad(month)}.${year}`;
}

export function lastDayString(year: number, month: number) {
  return formatDate(year, month, daysInMonth(year, month));
}

export const DAY_NAMES_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
