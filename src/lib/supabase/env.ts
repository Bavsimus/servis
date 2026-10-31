/**
 * Supabase bağlantı ayarları. Yeni projeler "publishable key", eskiler "anon key" verir; ikisi de kabul edilir.
 * NEXT_PUBLIC_ değişkenleri derlemede koda gömüldüğü için doğrudan process.env.X olarak okunmalı.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function supabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey);
}
