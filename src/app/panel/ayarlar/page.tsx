"use client";

import { useState } from "react";
import { addMember, exportOrganization, listMembers, removeMember, renameOrganization } from "@/lib/data/repo";
import { useData } from "@/lib/data/use-data";
import { useOrg } from "@/components/panel/org-context";
import { Button, Card, download, Field, inputCls, PageHeader } from "@/components/panel/ui";

const ROLE_LABELS = { owner: "Sahip", admin: "Yönetici", member: "Üye" } as const;

export default function SettingsPage() {
  const { org, email: me, reloadOrgs } = useOrg();
  const isAdmin = org.role === "owner" || org.role === "admin";
  const members = useData(() => listMembers(org.id), [org.id]);
  const [name, setName] = useState(org.name);
  const [invite, setInvite] = useState({ email: "", role: "member" as "admin" | "member" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }

  return (
    <>
      <PageHeader title="Firma ve ekip" />
      {msg && (
        <p className={`mb-4 rounded-lg p-3 text-sm ${msg.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{msg.text}</p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Firma">
          <Field label="Firma adı">
            <input className={inputCls} value={name} disabled={!isAdmin} onChange={(e) => setName(e.target.value)} />
          </Field>
          {isAdmin && (
            <Button
              className="mt-4"
              disabled={!name.trim() || name === org.name}
              onClick={() => run(async () => (await renameOrganization(org.id, name.trim()), await reloadOrgs()), "Firma adı güncellendi.")}
            >
              Kaydet
            </Button>
          )}
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-sm font-medium">Dışa aktarma</p>
            <p className="mt-1 text-sm text-muted">Kurum, sürücü ve araç kayıtlarının tamamını JSON dosyası olarak indirir.</p>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={async () =>
                download(await exportOrganization(org.id), `${org.name}-${new Date().toISOString().slice(0, 10)}.json`, "application/json")
              }
            >
              Verileri indir
            </Button>
          </div>
        </Card>

        <Card title="Ekip">
          <ul className="divide-y divide-line text-sm">
            {members.data?.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 py-2.5">
                <span className="truncate">{m.email}</span>
                {m.email === me && <span className="text-xs text-subtle">(siz)</span>}
                <span className="ml-auto rounded-full bg-raised px-2 py-0.5 text-xs text-muted">{ROLE_LABELS[m.role]}</span>
                {isAdmin && m.role !== "owner" && m.email !== me && (
                  <Button
                    variant="danger"
                    className="px-2 py-1"
                    onClick={() =>
                      confirm(`${m.email} ekipten çıkarılsın mı?`) &&
                      run(async () => (await removeMember(org.id, m.userId), await members.reload()), "Üye çıkarıldı.")
                    }
                  >
                    Çıkar
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {isAdmin && (
            <form
              className="mt-5 border-t border-line pt-5"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  await addMember(org.id, invite.email, invite.role);
                  setInvite({ ...invite, email: "" });
                  await members.reload();
                }, "Üye eklendi.");
              }}
            >
              <p className="text-sm font-medium">Ekip arkadaşı ekle</p>
              <p className="mt-1 text-xs text-muted">
                Kişinin önce bir hesabı olmalı (Supabase panelinden davet edilebilir ya da kayıt açıksa kendisi oluşturur).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="email"
                  required
                  placeholder="e-posta"
                  className={`${inputCls} min-w-0 flex-1`}
                  value={invite.email}
                  onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                />
                <select
                  className={`${inputCls} w-auto`}
                  value={invite.role}
                  onChange={(e) => setInvite({ ...invite, role: e.target.value as "admin" | "member" })}
                >
                  <option value="member">Üye</option>
                  <option value="admin">Yönetici</option>
                </select>
                <Button type="submit">Ekle</Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
