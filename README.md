# Servis — Cantürk tanıtım sitesi + Servis Paneli

Tek Next.js projesi, iki parça:

| Adres | İçerik |
| --- | --- |
| `alanadi.com` | Cantürk tanıtım sitesi (`src/app/page.tsx`, bilgiler `src/config/site.ts`) |
| `panel.alanadi.com` veya `alanadi.com/panel` | **Servis Paneli**: çok firmalı yönetim paneli (Supabase) |

`panel.` alt alanı ayrı bir Vercel projesi gerektirmez: `src/middleware.ts` bu alandan gelen istekleri `/panel` sayfalarına yönlendirir.

## Ürün mimarisi (çok firmalı)

Panel Cantürk'e özel değildir; Cantürk sistemin ilk müşterisidir. Başka bir servis firması aynı kurulumda kendi hesabını açıp yalnızca kendi verisini görür.

```
organizations (servis firması: Cantürk, ...)
 ├─ memberships   kullanıcı ↔ firma, rol: owner / admin / member
 ├─ clients       müşteri kurumlar (KGM 1. Bölge ...) → çizelge şablonu + sayfa başlığı
 ├─ drivers       sürücüler (ad, TC, telefon)
 ├─ vehicles      araçlar → kurum, sürücüler, km ve çalışma ayarları
 └─ timesheets    kaydedilen aylık çizelgeler (tekrar açma / indirme)
```

- **Veri izolasyonu veritabanında** (Row Level Security). Her tablo `org_id` taşır; kullanıcı yalnızca üyesi olduğu firmanın satırlarını okuyup yazabilir. Araç başka firmanın kurumuna bağlanamaz (bileşik yabancı anahtar). Kurallar `supabase/migrations/` içinde.
- **Çizelge formatları şablon kaydında**: `src/lib/puantaj/templates/`. Her müşteri kurum bir şablon seçer. Yeni bir kurum formatı (başka bölge müdürlüğü, belediye, fabrika...) eklemek için kurumun Excel'inden düzen çıkarılır:
  ```bash
  python scripts/extract-layout.py "KURUM PUANTAJ.xlsx" <sayfa_no> <sablon_id>
  ```
  ardından `templates/index.ts`'e kaydedilir.
- **Marka ayrımı**: Cantürk'e ait her şey `src/config/site.ts` ve `src/components/logo.tsx`'te (tanıtım sitesi). Panelin ürün adı `src/config/product.ts`'te; panelde görünen firma adı veritabanından gelir.
- **Kayıt**: `NEXT_PUBLIC_ALLOW_SIGNUP=true` olunca giriş ekranında "Hesap oluştur" açılır; yeni kullanıcı ilk girişte kendi firmasını oluşturur. Şimdilik kapalı: kullanıcılar Supabase panelinden eklenir, firmaya **Firma ve ekip** sayfasından katılır.

## Panel araçları

### Puantaj oluşturma

1. **Kurumlar**: puantaj verdiğiniz kurumu ve çizelge formatını tanımlayın (ilk firma oluşturulurken "Varsayılan kurum" gelir; adını değiştirin).
2. **Araçlar**: geçen ayın puantaj Excel'ini yükleyin. Araç, sürücü, TC, poz no, güzergâh, günlük km aralığı ve son km okunur; sürücüler TC'ye göre eşleştirilir.
3. **Puantaj oluştur**: kurumu ve ayı seçin, resmî tatilleri kontrol edin, çizelgeleri oluşturun, gün gün düzeltin, **Kaydet ve Excel indir**. Ay kaydedilir ve araçların son km'si güncellenir.

İki sayfa tipi: **tek sürücü** (isteğe bağlı mesai saatleri) ve **3 sürücülü vardiya** (gündüz / gece / izin dönüşümü).

Örnek (hayali verili) çıktı: `npx tsx scripts/sample-puantaj.ts ornek.xlsx`

> Gerçek puantaj dosyaları kişisel veri içerir; `.gitignore` tüm `.xlsx` dosyalarını dışarıda bırakır.

## Kurulum

### 1. Supabase

1. [supabase.com](https://supabase.com)'da proje açın. Bölge olarak **Frankfurt (eu-central-1)** seçin: TC kimlik numarası gibi kişisel veriler AB'de kalsın (KVKK).
2. **SQL Editor**'de `supabase/migrations/20261031000000_init.sql` dosyasının içeriğini çalıştırın.
   (CLI ile: `supabase link --project-ref <ref>` ardından `supabase db push`.)
3. **Authentication → URL Configuration**: Site URL = `https://panel.alanadi.com`; Redirect URLs'e `https://panel.alanadi.com/auth/callback` ve geliştirme için `http://localhost:3000/auth/callback` ekleyin.
4. **Authentication → Users → Add user** ile kendi hesabınızı oluşturun (kayıt kapalıyken).

### 2. Geliştirme

```bash
npm install
cp .env.example .env.local   # URL ve publishable key'i doldurun
npm run dev
```

İlk girişte panel firma adını sorar; firmanızı oluşturduktan sonra araçları içe aktarabilirsiniz.

### 3. Vercel

1. Repoyu Vercel'e bağlayın (framework: Next.js).
2. **Settings → Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ve isterseniz `NEXT_PUBLIC_ALLOW_SIGNUP`).
3. **Settings → Domains**: `alanadi.com` ve `panel.alanadi.com` ikisini de aynı projeye ekleyin.
