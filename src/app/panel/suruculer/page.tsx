"use client";

import { useState } from "react";
import { deleteDriver, listDrivers, listVehicles, saveDriver } from "@/lib/data/repo";
import { useData } from "@/lib/data/use-data";
import type { DriverRecord } from "@/lib/puantaj/types";
import { useOrg } from "@/components/panel/org-context";
import { Button, Card, Field, inputCls, PageHeader } from "@/components/panel/ui";

const EMPTY: DriverRecord = { id: "", name: "", tc: "", phone: "", active: true };

export default function DriversPage() {
  const { org } = useOrg();
  const { data, error, reload } = useData(
    async () => {
      const [drivers, vehicles] = await Promise.all([listDrivers(org.id), listVehicles(org.id)]);
      return { drivers, vehicles };
    },
    [org.id],
  );
  const [editing, setEditing] = useState<DriverRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const plates = (id: string) =>
    data?.vehicles.filter((v) => v.driverIds.includes(id)).map((v) => v.plate).join(", ") ?? "";

  async function save() {
    if (!editing) return;
    setBusy(true);
    setMsg("");
    try {
      await saveDriver(org.id, { ...editing, id: editing.id || undefined });
      setEditing(null);
      await reload();
    } catch (e) {
      setMsg((e as Error).message.includes("drivers_org_tc_key") ? "Bu T.C. kimlik no ile kayıtlı başka bir sürücü var." : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Sürücüler"
        text="Sürücüler araçlara buradan atanır; aynı sürücü farklı aylarda farklı araçlarda görev alabilir."
        actions={<Button onClick={() => setEditing(EMPTY)}>Sürücü ekle</Button>}
      />
      {(error || msg) && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error || msg}</p>}

      {editing && (
        <Card
          className="mb-6"
          title={editing.id ? `${editing.name} düzenleniyor` : "Yeni sürücü"}
          actions={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Vazgeç
              </Button>
              <Button onClick={save} disabled={busy || !editing.name.trim()}>
                Kaydet
              </Button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Adı soyadı">
              <input
                className={inputCls}
                autoFocus
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value.toLocaleUpperCase("tr-TR") })}
              />
            </Field>
            <Field label="T.C. kimlik no">
              <input
                className={inputCls}
                inputMode="numeric"
                maxLength={11}
                value={editing.tc}
                onChange={(e) => setEditing({ ...editing, tc: e.target.value.replace(/\D/g, "") })}
              />
            </Field>
            <Field label="Telefon">
              <input className={inputCls} value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </Field>
          </div>
        </Card>
      )}

      <Card>
        {data && data.drivers.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            Henüz sürücü yok. Puantaj Excel&apos;ini içe aktardığınızda sürücüler de otomatik eklenir.
          </p>
        ) : (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-raised text-left text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Adı soyadı</th>
                  <th className="font-medium">T.C. kimlik no</th>
                  <th className="font-medium">Telefon</th>
                  <th className="font-medium">Araç</th>
                  <th className="px-4 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data?.drivers.map((d) => (
                  <tr key={d.id} className={d.active ? "" : "text-subtle"}>
                    <td className="px-4 py-2.5 font-medium">{d.name}</td>
                    <td className="tabular-nums">{d.tc}</td>
                    <td>{d.phone}</td>
                    <td className="text-muted">{plates(d.id) || "—"}</td>
                    <td className="whitespace-nowrap px-4 text-right">
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          await saveDriver(org.id, { ...d, active: !d.active });
                          reload();
                        }}
                      >
                        {d.active ? "Pasifleştir" : "Aktifleştir"}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing(d)}>
                        Düzenle
                      </Button>
                      <Button
                        variant="danger"
                        onClick={async () => {
                          if (!confirm(`${d.name} silinsin mi?`)) return;
                          await deleteDriver(d.id);
                          reload();
                        }}
                      >
                        Sil
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
