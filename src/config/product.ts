/**
 * Panelin ürün kimliği. Panel firmadan bağımsızdır: her firma kendi verisini görür,
 * ekranlarda firma adı veritabanından gelir. İleride ürün adı/markası buradan değişir.
 */
export const product = {
  name: "Servis Paneli",
  /** Kendi kendine kayıt (yeni firma hesabı) açık mı? Kapalıyken kullanıcılar Supabase'den davet edilir. */
  allowSignup: process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true",
};
