import { site } from "@/config/site";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/icon";

const nav = [
  { href: "#hizmetler", label: "Hizmetler" },
  { href: "#kurumlar", label: "Kamu kurumları" },
  { href: "#filo", label: "Filo" },
  { href: "#surec", label: "Süreç" },
];

const tel = `tel:${site.phone.replace(/[^\d+]/g, "")}`;

export default function Home() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4">
          <a href="#" aria-label={site.name}>
            <Logo className="text-base" />
          </a>
          <nav className="hidden gap-8 text-sm text-muted md:flex">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="transition hover:text-fg">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <a href={tel} className="hidden text-sm text-muted transition hover:text-fg lg:block">
              {site.phone}
            </a>
            <a href="#iletisim" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover">
              Teklif alın
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Giriş */}
        <section className="relative">
          <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-brand/15 blur-[120px]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 md:pt-24 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.03] px-3 py-1 text-xs font-medium text-muted">
                <span className="size-1.5 rounded-full bg-brand" />
                {site.tagline}
              </p>
              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-[3.5rem]">
                {site.heroTitle}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{site.description}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#iletisim" className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-hover">
                  Teklif isteyin <Icon name="arrow" className="size-4" />
                </a>
                <a href="#hizmetler" className="rounded-full border border-line-strong px-6 py-3 font-medium text-fg transition hover:bg-white/5">
                  Hizmetlerimiz
                </a>
              </div>
            </div>
            <SheetPreview />
          </div>

          {/* Rakamlar */}
          <div className="relative border-y border-line bg-surface/60">
            <dl className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
              {site.stats.map((s, i) => (
                <div key={s.label} className={`border-line px-4 py-8 md:px-8 ${i % 2 ? "border-l" : ""} ${i === 2 ? "md:border-l" : ""} ${i < 2 ? "border-b md:border-b-0" : ""}`}>
                  <dt className="text-sm text-muted">{s.label}</dt>
                  <dd className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Güvence */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {site.credentials.map((c) => (
              <div key={c.title} className="bg-ink p-6">
                <Icon name="shield" className="size-6 text-brand" />
                <h3 className="mt-4 font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm text-muted">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Hizmetler */}
        <section id="hizmetler" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24">
          <SectionHead
            kicker="Hizmetler"
            title="Servis operasyonunun tamamı tek elden"
            text="Hat planlamasından aylık raporlamaya kadar araç, sürücü ve evrak bizde. Size tek bir muhatap kalır."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {site.services.map((s) => (
              <article
                key={s.title}
                className="group rounded-2xl border border-line bg-surface p-7 transition hover:border-brand/40 hover:bg-raised"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon name={s.icon} />
                </span>
                <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Kamu kurumları */}
        <section id="kurumlar" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 lg:grid-cols-2">
            <div>
              <SectionHead
                kicker="Kamu kurumları"
                title="Evrak tarafında da sözleşmeye tam uyum"
                text="Kamu kurumlarıyla çalışmanın en titiz kısmı aylık çizelgelerdir. Her aracın kaydını kurumun kendi formatında, imzaya hazır şekilde zamanında teslim ediyoruz."
              />
              <ul className="mt-8 space-y-3">
                {site.publicSector.map((p) => (
                  <li key={p} className="flex gap-3">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand text-white">
                      <Icon name="check" className="size-3" />
                    </span>
                    <span className="text-fg/90">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {site.steps.map((s, i) => (
                <div key={s.title} className="rounded-2xl border border-line bg-ink p-6" id={i === 0 ? "surec" : undefined}>
                  <span className="font-display text-sm font-bold text-brand">0{i + 1}</span>
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Filo */}
        <section id="filo" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
          <SectionHead kicker="Filo" title="İhtiyaca göre doğru araç" text="Tüm araçlar bakımlı, sigortalı ve muayenesi güncel." />
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {site.fleet.map((f) => (
              <div key={f.kind} className="rounded-2xl border border-line bg-surface p-6">
                <p className="font-display text-xl font-bold">{f.kind}</p>
                <p className="mt-4 text-xs uppercase tracking-wider text-subtle">Kapasite</p>
                <p className="text-sm">{f.seats}</p>
                <p className="mt-3 text-xs uppercase tracking-wider text-subtle">Kullanım</p>
                <p className="text-sm text-muted">{f.use}</p>
              </div>
            ))}
          </div>
        </section>

        {/* İletişim */}
        <section id="iletisim" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-line-strong bg-surface p-8 md:p-14">
            <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-brand/20 blur-[100px]" />
            <div className="relative grid gap-12 md:grid-cols-[1.2fr_1fr]">
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Servis ihtiyacınızı konuşalım</h2>
                <p className="mt-4 max-w-md text-muted">
                  Personel sayınızı, adresleri ve çalışma saatlerinizi paylaşın; size uygun hat ve araç planıyla dönelim.
                </p>
                <a href={tel} className="mt-8 inline-flex items-center gap-3 rounded-full bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-hover">
                  <Icon name="phone" className="size-4" /> {site.phone}
                </a>
              </div>
              <dl className="grid content-start gap-6 text-sm">
                <Contact label="E-posta" value={site.email} href={`mailto:${site.email}`} />
                <Contact label="Adres" value={site.address} />
                <Contact label="Çalışma saatleri" value={site.workingHours} />
              </dl>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-subtle">
          <div className="flex items-center gap-4">
            <Logo className="text-sm" />
            <span>
              © {new Date().getFullYear()} {site.name}. Tüm hakları saklıdır.
            </span>
          </div>
          <a href="/giris" className="transition hover:text-fg">
            Yönetici girişi
          </a>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ kicker, title, text }: { kicker: string; title: string; text?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">{kicker}</p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance md:text-4xl">{title}</h2>
      {text && <p className="mt-4 leading-relaxed text-muted">{text}</p>}
    </div>
  );
}

function Contact({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="border-b border-line pb-5">
      <dt className="text-subtle">{label}</dt>
      <dd className="mt-1 text-base font-medium">
        {href ? (
          <a href={href} className="transition hover:text-brand">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/** Hero'daki örnek çalışma çizelgesi: işin ciddiyetini gösteren dekoratif kart (hayali veri) */
function SheetPreview() {
  const rows = [
    ["01.10", "80.322", "196", "80.518"],
    ["02.10", "80.518", "194", "80.712"],
    ["05.10", "80.712", "198", "80.910"],
    ["06.10", "80.910", "195", "81.105"],
    ["07.10", "81.105", "195", "81.300"],
  ];
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-white/15 to-transparent" />
      <div className="relative rounded-3xl bg-surface p-6 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-subtle">Kiralık araç çalışma çizelgesi</p>
            <p className="mt-1 font-display text-lg font-bold">Ekim 2026</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400" /> Teslim edildi
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
          {[
            ["Plaka", "41 CT 001"],
            ["Cinsi", "Minibüs"],
            ["Poz no", "S-29/62"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-line bg-ink px-3 py-2">
              <p className="text-subtle">{k}</p>
              <p className="mt-0.5 font-medium text-fg">{v}</p>
            </div>
          ))}
        </div>
        <table className="mt-5 w-full text-xs tabular-nums">
          <thead className="text-subtle">
            <tr className="border-b border-line">
              <th className="py-2 text-left font-medium">Tarih</th>
              <th className="text-right font-medium">Gün başı</th>
              <th className="text-right font-medium">Km</th>
              <th className="text-right font-medium">Gün sonu</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            {rows.map((r) => (
              <tr key={r[0]} className="border-b border-line/60">
                <td className="py-2 text-fg">{r[0]}</td>
                <td className="text-right">{r[1]}</td>
                <td className="text-right text-fg">{r[2]}</td>
                <td className="text-right">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-subtle">Toplam 21 gün · 4.143 km</span>
          <span className="text-subtle">
            UBGT: <span className="text-fg">1 gün</span>
          </span>
        </div>
      </div>
    </div>
  );
}
