/**
 * Tanıtım sitesindeki tüm firma bilgileri buradan gelir.
 * Köşeli parantezli değerler yer tutucudur; gerçek bilgilerle değiştirin.
 * Belge/sigorta maddeleri firmada gerçekten varsa bırakın, yoksa çıkarın.
 */
export const site = {
  name: "Cantürk",
  tagline: "Personel Taşımacılığı ve Sürücülü Araç Kiralama",
  heroTitle: "Kurumunuzun ulaşımı, sözleşmede yazdığı gibi.",
  description:
    "Kamu kurumları ve şirketler için personel servisi, sürücülü araç kiralama ve 7/24 vardiyalı araç hizmeti. Her ay eksiksiz çalışma çizelgesi ve raporlama.",
  founded: "[Yıl]",
  phone: "+90 [5xx xxx xx xx]",
  email: "[info@canturk.com.tr]",
  address: "[Adres, İlçe / Şehir]",
  workingHours: "Hafta içi 08:00 – 18:00 · Operasyon 7/24",
  stats: [
    { value: "[25]+", label: "Araçlık filo" },
    { value: "7/24", label: "Vardiyalı operasyon" },
    { value: "[10]+", label: "Yıllık tecrübe" },
    { value: "%100", label: "Zamanında teslim edilen puantaj" },
  ],
  credentials: [
    { title: "Yetki belgeli", text: "[D2 / B2] taşımacılık yetki belgesi" },
    { title: "Tam sigortalı", text: "Zorunlu mali sorumluluk ve koltuk ferdi kaza" },
    { title: "Belgeli sürücüler", text: "SRC, psikoteknik ve sabıka kaydı kontrollü" },
    { title: "Yedek araç güvencesi", text: "Arıza ve bakımda aynı gün yedek araç" },
  ],
  services: [
    {
      icon: "users",
      title: "Personel servisi",
      text: "Fabrika, ofis ve şantiyeler için sabah-akşam ve vardiyalı servis hatları. Güzergâh ve saatler çalışma düzeninize göre kurulur.",
    },
    {
      icon: "key",
      title: "Sürücülü araç kiralama",
      text: "Kamu kurumlarına aylık sözleşmeli minibüs, kamyonet, panelvan ve binek araç; deneyimli, belgeli sürücülerle.",
    },
    {
      icon: "clock",
      title: "7/24 vardiyalı araç",
      text: "Gündüz ve gece vardiyalarında kesintisiz görev için üç sürücülü dönüşümlü çalışma düzeni.",
    },
    {
      icon: "school",
      title: "Öğrenci servisi",
      text: "Okul güzergâhlarında rehber personelli, takipli ve güvenli taşımacılık.",
    },
    {
      icon: "map",
      title: "Turizm ve organizasyon",
      text: "Gezi, toplantı, fuar ve özel günler için günlük ya da saatlik araç tahsisi.",
    },
    {
      icon: "doc",
      title: "Raporlama",
      text: "Araç başına günlük km, mesai ve fazla çalışma kayıtları; her ay kurum formatında hazır çalışma çizelgesi.",
    },
  ],
  steps: [
    { title: "İhtiyaç analizi", text: "Personel sayısı, adresler ve vardiya saatlerine göre talebi çıkarırız." },
    { title: "Güzergâh ve filo", text: "Hat ve araç tipini belirler, sürücüleri görevlendiririz." },
    { title: "Günlük operasyon", text: "Araçlar her gün kontrol edilir, aksaklıkta yedek araç devreye girer." },
    { title: "Aylık raporlama", text: "Km, mesai ve UBGT kayıtları ay sonunda kurum formatında teslim edilir." },
  ],
  publicSector: [
    "Kurumun kendi çizelge formatında aylık puantaj",
    "Araç başına günlük km, mesai ve fazla çalışma kaydı",
    "Resmî tatil (UBGT) çalışmalarının ayrı gösterimi",
    "Şoför, yüklenici ve kontrol imzalarına hazır çıktı",
  ],
  fleet: [
    { kind: "Minibüs", seats: "16+1 / 19+1", use: "Personel servisi" },
    { kind: "Midibüs", seats: "27+1", use: "Kalabalık hatlar" },
    { kind: "Panelvan", seats: "2+1", use: "Saha ve vardiyalı görev" },
    { kind: "Kamyonet", seats: "Yük + 2", use: "Malzeme taşıma" },
    { kind: "Otomobil", seats: "4+1", use: "Makam ve görev aracı" },
  ],
} as const;
