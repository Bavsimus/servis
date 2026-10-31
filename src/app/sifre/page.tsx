"use client";

import { useState } from "react";
import { product } from "@/config/product";
import { supabase } from "@/lib/supabase/client";

/** Şifre yenileme bağlantısından gelen kullanıcı yeni şifresini belirler */
export default function NewPasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase().auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setBusy(false);
    } else {
      window.location.href = "/panel";
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-line-strong bg-surface p-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          <span className="size-1.5 rounded-full bg-brand" />
          {product.name}
        </p>
        <h1 className="mt-6 font-display text-2xl font-bold">Yeni şifre</h1>
        <p className="mt-1 text-sm text-muted">En az 8 karakter.</p>
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-6 w-full rounded-xl border border-line-strong bg-ink px-3.5 py-2.5 outline-none focus:border-brand"
        />
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          disabled={busy || password.length < 8}
          className="mt-6 w-full rounded-xl bg-brand py-2.5 font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          Şifreyi kaydet
        </button>
      </form>
    </main>
  );
}
