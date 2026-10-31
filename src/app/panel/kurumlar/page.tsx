"use client";

import { useState } from "react";
import { deleteClient, listAssignments, listClients, saveClient } from "@/lib/data/repo";
import { useData } from "@/lib/data/use-data";
import { getTemplate, TEMPLATES, DEFAULT_TEMPLATE_ID } from "@/lib/puantaj/templates";
import type { Client } from "@/lib/puantaj/types";
import { useOrg } from "@/components/panel/org-context";
import { Button, Card, Field, inputCls, PageHeader } from "@/components/panel/ui";

const EMPTY: Client = { id: "", name: "", templateId: DEFAULT_TEMPLATE_ID, sheetTitle: "", active: true };

export default function ClientsPage() {
  const { org } = useOrg();
  const { data, error, reload } = useData(
    async () => {
      const [clients, assignments] = await Promise.all([listClients(org.id), listAssignments(org.id)]);
      return { clients, assignments };
    },
    [org.id],
  );
  const [editing, setEditing] = useState<Client | null>(null);
  const [msg, setMsg] = useState("");

  async function save() {
    if (!editing) return;
    try {
      await saveClient(org.id, { ...editing, id: editing.id || undefined });
      setEditing(null);
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader
        title="Kurumlar"
        text="Araç kiraladığınız ya da servis verdiğiniz kurumlar. Her kurumun puantajı kendi çizelge formatında ve başlığıyla hazırlanır."
        actions={<Button onClick={() => setEditing(EMPTY)}>Kurum ekle</Button>}
      />
      {(error || msg) && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error || msg}</p>}

      {editing && (
        <Card
          className="mb-6"
          title={editing.id ? `${editing.name} düzenleniyor` : "Yeni kurum"}
          actions={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Vazgeç
              </Button>
              <Button onClick={save} disabled={!editing.name.trim()}>
                Kaydet
              </Button>
            </>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <Field label="Kurum adı">
                <input
                  className={inputCls}
                  autoFocus
                  value={editing.name}
                  placeholder="KGM 1. Bölge Tütünçiftlik"
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
              <Field label="Çizelge formatı" hint={getTemplate(editing.templateId).description}>
                <select className={inputCls} value={editing.templateId} onChange={(e) => setEditing({ ...editing, templateId: e.target.value })}>
                  {Object.values(TEMPLATES).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="text-xs text-subtle">Listede olmayan bir format için kurumun Excel dosyası sisteme şablon olarak eklenir.</p>
            </div>
            <Field label="Sayfa başlığı" hint="Boş bırakılırsa formatın kendi başlığı kullanılır. Satır sonları korunur.">
              <textarea
                rows={6}
                className={inputCls}
                placeholder={getTemplate(editing.templateId).defaultTitle}
                value={editing.sheetTitle}
                onChange={(e) => setEditing({ ...editing, sheetTitle: e.target.value })}
              />
            </Field>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.clients.map((c) => {
          const count = data.assignments.filter((a) => a.clientId === c.id).length;
          return (
            <Card key={c.id} className={c.active ? "" : "opacity-60"}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold">{c.name}</h2>
                  <p className="mt-1 text-sm text-muted">{getTemplate(c.templateId).name}</p>
                  <p className="mt-3 text-sm">
                    <span className="font-semibold">{count}</span> <span className="text-muted">araç</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" onClick={() => setEditing(c)}>
                    Düzenle
                  </Button>
                  <Button
                    variant="danger"
                    onClick={async () => {
                      if (!confirm(`${c.name} silinsin mi? Kayıtlı çizelgeleri ve araçların bu kurumdaki görevleri de silinir; araçların kendisi silinmez.`)) return;
                      await deleteClient(c.id);
                      reload();
                    }}
                  >
                    Sil
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
