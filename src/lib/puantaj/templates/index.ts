import type ExcelJS from "exceljs";
import type { LayoutKind } from "../types";
import kgmLayout from "./kgm-kiralik-arac/layout.json";

export interface BlockLayout {
  rows: number;
  dayRow: number;
  heights: (number | null)[];
  cells: Record<string, Record<string, { s: number; v?: string }>>;
  merges: [number, number, number, number][];
  weekday: Record<string, number>;
  weekend: Record<string, number>;
  images: { file: string; ext: string; col: number; colOff: number; row: number; rowOff: number; width: number; height: number }[];
}

export interface TemplateLayout {
  columns: (number | null)[];
  styles: Partial<ExcelJS.Style>[];
  layouts: Record<LayoutKind, BlockLayout>;
  page: {
    orientation: "portrait" | "landscape";
    paperSize: number;
    margins: { left: number; right: number; top: number; bottom: number; header: number; footer: number };
  };
}

export interface PuantajTemplate {
  id: string;
  name: string;
  description: string;
  layout: TemplateLayout;
  /** Şablonun sayfa başlığı (müşteri kurum kendi başlığını girmezse) */
  defaultTitle: string;
}

/**
 * Müşteri kurumların çizelge formatları. Yeni bir kurum formatı eklemek için:
 * 1. scripts/extract-layout.py ile layout.json ve logoları çıkarın
 * 2. Buraya kaydedin; gerekiyorsa excel.ts'teki hücre eşlemesini (COLS) şablona özel yapın
 */
const kgm = kgmLayout as unknown as TemplateLayout;

export const TEMPLATES: Record<string, PuantajTemplate> = {
  "kgm-kiralik-arac": {
    id: "kgm-kiralik-arac",
    name: "KGM · Kiralık araç çalışma çizelgesi",
    description: "Karayolları Genel Müdürlüğü formatı; tek sürücülü ve 3 sürücülü vardiyalı sayfalar.",
    layout: kgm,
    defaultTitle: kgm.layouts.tek.cells["0"].A.v ?? "",
  },
};

export const DEFAULT_TEMPLATE_ID = "kgm-kiralik-arac";

export function getTemplate(id: string | null | undefined): PuantajTemplate {
  return TEMPLATES[id ?? ""] ?? TEMPLATES[DEFAULT_TEMPLATE_ID];
}
