"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createOrganization, listOrganizations } from "@/lib/data/repo";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import type { Organization } from "@/lib/puantaj/types";
import { Button, Card, Field, inputCls } from "./ui";

interface OrgState {
  org: Organization;
  orgs: Organization[];
  email: string;
  switchOrg: (id: string) => void;
  reloadOrgs: () => Promise<void>;
}

const OrgContext = createContext<OrgState | null>(null);
const CURRENT_KEY = "servis.org";

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg OrgProvider dışında kullanıldı");
  return ctx;
}

/** Kullanıcının üye olduğu firmaları yükler; hiç firması yoksa kurulum ekranını gösterir */
export function OrgProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrgs] = useState<Organization[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const reloadOrgs = useCallback(async () => {
    try {
      const list = await listOrganizations();
      setOrgs(list);
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(CURRENT_KEY);
      } catch {}
      setCurrentId((cur) => [cur, saved].find((id) => id && list.some((o) => o.id === id)) ?? list[0]?.id ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured()) return;
    supabase()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? ""));
    reloadOrgs();
  }, [reloadOrgs]);

  const switchOrg = useCallback((id: string) => {
    setCurrentId(id);
    try {
      localStorage.setItem(CURRENT_KEY, id);
    } catch {}
  }, []);

  if (!supabaseConfigured()) return <Notice text="Supabase bağlantı ayarları (NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY) tanımlı değil." />;
  if (error) return <Notice text={`Veriler yüklenemedi: ${error}`} />;
  if (!orgs) return <Notice text="Yükleniyor…" muted />;

  const org = orgs.find((o) => o.id === currentId);
  if (!org) return <Onboarding onCreated={async (id) => (switchOrg(id), reloadOrgs())} />;

  return <OrgContext.Provider value={{ org, orgs, email, switchOrg, reloadOrgs }}>{children}</OrgContext.Provider>;
}

function Notice({ text, muted }: { text: string; muted?: boolean }) {
  return <p className={`p-8 text-sm ${muted ? "text-muted" : "text-red-300"}`}>{text}</p>;
}

function Onboarding({ onCreated }: { onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="mx-auto max-w-lg py-10">
      <Card title="Firmanızı oluşturun">
        <p className="mb-4 text-sm text-muted">
          Araçlar, sürücüler ve çizelgeler firmanıza bağlı tutulur. Ekip arkadaşlarınızı daha sonra Ayarlar sayfasından
          ekleyebilirsiniz.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              onCreated(await createOrganization(name));
            } catch (err) {
              setError((err as Error).message);
              setBusy(false);
            }
          }}
          className="space-y-4"
        >
          <Field label="Firma adı">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Cantürk Turizm" autoFocus />
          </Field>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? "Oluşturuluyor…" : "Firmayı oluştur"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
