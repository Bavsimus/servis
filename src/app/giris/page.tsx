"use client";

import Link from "next/link";
import { useState } from "react";
import { product } from "@/config/product";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";

type Mode = "giris" | "kayit" | "sifre";

const MESSAGES: Record<string, string> = {
  "Invalid login credentials": "E-posta ya da şifre hatalı.",
  "Email not confirmed": "E-posta adresiniz henüz doğrulanmamış. Gelen kutunuzu kontrol edin.",
  "User already registered": "Bu e-posta ile zaten bir hesap var.",
};

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("giris");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    const auth = supabase().auth;
    const callback = `${window.location.origin}/auth/callback`;
    const { error } =
      mode === "giris"
        ? await auth.signInWithPassword({ email, password })
        : mode === "kayit"
          ? await auth.signUp({ email, password, options: { emailRedirectTo: `${callback}?next=/panel` } })
          : await auth.resetPasswordForEmail(email, { redirectTo: `${callback}?next=/sifre` });
    setBusy(false);
    if (error) {
      setError(MESSAGES[error.message] ?? error.message);
      return;
    }
    if (mode === "giris") {
      window.location.href = "/panel";
    } else if (mode === "kayit") {
      setInfo("Hesabınız oluşturuldu. Doğrulama gerekiyorsa e-postanızdaki bağlantıya tıklayın, sonra giriş yapın.");
      setMode("giris");
    } else {
      setInfo("Şifre yenileme bağlantısı e-posta adresinize gönderildi.");
    }
  }

  const titles: Record<Mode, [string, string, string]> = {
    giris: ["Yönetim paneli", "Hesabınızla giriş yapın.", "Giriş yap"],
    kayit: ["Hesap oluşturun", "Firmanızı ilk girişte oluşturacaksınız.", "Hesap oluştur"],
    sifre: ["Şifremi unuttum", "E-posta adresinize yenileme bağlantısı gönderelim.", "Bağlantı gönder"],
  };
  const [title, subtitle, cta] = titles[mode];

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-[120px]" />
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-3xl border border-line-strong bg-surface/90 p-8 shadow-2xl shadow-black/50 backdrop-blur">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          <span className="size-1.5 rounded-full bg-brand" />
          {product.name}
        </p>
        <h1 className="mt-6 font-display text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>

        {!supabaseConfigured() && (
          <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
            Supabase bağlantı ayarları tanımlı değil (.env.local).
          </p>
        )}

        <label className="mt-6 block text-sm font-medium text-fg/90" htmlFor="email">
          E-posta
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line-strong bg-ink px-3.5 py-2.5 outline-none transition focus:border-brand"
        />
        {mode !== "sifre" && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <label className="text-sm font-medium text-fg/90" htmlFor="pw">
                Şifre
              </label>
              {mode === "giris" && (
                <button type="button" onClick={() => setMode("sifre")} className="text-xs text-muted hover:text-fg">
                  Şifremi unuttum
                </button>
              )}
            </div>
            <input
              id="pw"
              type="password"
              autoComplete={mode === "kayit" ? "new-password" : "current-password"}
              minLength={mode === "kayit" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line-strong bg-ink px-3.5 py-2.5 outline-none transition focus:border-brand"
            />
          </>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {info && <p className="mt-3 text-sm text-emerald-300">{info}</p>}
        <button
          disabled={busy || !email || (mode !== "sifre" && !password) || !supabaseConfigured()}
          className="mt-6 w-full rounded-xl bg-brand py-2.5 font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {busy ? "Lütfen bekleyin…" : cta}
        </button>

        <div className="mt-6 flex justify-between text-xs text-subtle">
          <Link href="/" className="hover:text-fg">
            ← Siteye dön
          </Link>
          {mode !== "giris" ? (
            <button type="button" onClick={() => setMode("giris")} className="hover:text-fg">
              Giriş ekranına dön
            </button>
          ) : (
            product.allowSignup && (
              <button type="button" onClick={() => setMode("kayit")} className="hover:text-fg">
                Hesap oluştur
              </button>
            )
          )}
        </div>
      </form>
    </main>
  );
}
