"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  listAssignments,
  listClients,
  listDrivers,
  listTimesheets,
  listVehicles,
  resolveVehicle,
  saveTimesheet,
  deleteTimesheet,
  setLastKm,
} from "@/lib/data/repo";
import { useData } from "@/lib/data/use-data";
import { daysInMonth, holidaysOf, lastDayString, MONTHS_TR, DAY_NAMES_SHORT, weekday } from "@/lib/puantaj/calendar";
import { buildSheet, totals } from "@/lib/puantaj/generate";
import { getTemplate } from "@/lib/puantaj/templates";
import type { MonthContext, TimesheetRecord, VehicleSheet } from "@/lib/puantaj/types";
import { useOrg } from "@/components/panel/org-context";
import { Button, Card, download, Field, inputCls, PageHeader } from "@/components/panel/ui";
import { SheetEditor } from "@/components/panel/sheet-editor";

function defaultMonth() {
  const now = new Date();
  // Ayın son haftasında o ayın puantajı hazırlanır, başında bir önceki ayınki
  const d = now.getDate() >= 20 ? now : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function PuantajPage() {
  const { org } = useOrg();
  const base = useData(
    async () => {
      const [vehicles, drivers, clients, assignments] = await Promise.all([
        listVehicles(org.id),
        listDrivers(org.id),
        listClients(org.id),
        listAssignments(org.id),
      ]);
      return { vehicles, drivers, clients, assignments };
    },
    [org.id],
  );
  const clients = useMemo(() => base.data?.clients.filter((c) => c.active) ?? [], [base.data]);
  const [clientId, setClientId] = useState("");
  useEffect(() => {
    if (!clients.some((c) => c.id === clientId) && clients[0]) setClientId(clients[0].id);
  }, [clients, clientId]);
  const client = clients.find((c) => c.id === clientId);
  const template = getTemplate(client?.templateId);

  const history = useData(() => (clientId ? listTimesheets(org.id, clientId) : Promise.resolve([])), [org.id, clientId]);

  const [{ year, month }, setYm] = useState(defaultMonth);
  const [holidays, setHolidays] = useState<Record<number, string>>(() => holidaysOf(year, month));
  const [signDate, setSignDate] = useState(() => lastDayString(year, month));
  const [excluded, setExcluded] = useState<string[]>([]);
  const [sheets, setSheets] = useState<VehicleSheet[]>([]);
  const [salt, setSalt] = useState(0);
  const [tab, setTab] = useState<string | null>(null);
  const [updateKm, setUpdateKm] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  // Kurumun araçları, kurumun sayfa sırasıyla; km ve poz bilgisi o kurumdaki görevden gelir
  const vehicles = useMemo(() => {
    const d = base.data;
    if (!d) return [];
    return d.assignments
      .filter((a) => a.clientId === clientId)
      .flatMap((a) => {
        const v = d.vehicles.find((x) => x.id === a.vehicleId);
        return v ? [resolveVehicle(v, a, d.drivers)] : [];
      })
      .filter((v) => v.active);
  }, [base.data, clientId]);
  const selected = vehicles.filter((v) => !excluded.includes(v.id));
  const saved = history.data?.find((t) => t.year === year && t.month === month);

  const ctx: MonthContext = { year, month, holidays, signDate, title: client?.sheetTitle ?? "" };

  function reset() {
    setSheets([]);
    setDone("");
    setError("");
  }

  function changeMonth(y: number, m: number) {
    setYm({ year: y, month: m });
    setHolidays(holidaysOf(y, m));
    setSignDate(lastDayString(y, m));
    reset();
  }

  function generate(nextSalt = salt) {
    const out = selected.map((v) => buildSheet(v, ctx, `${clientId}:${nextSalt}`));
    setSheets(out);
    setTab((t) => (t && out.some((s) => s.vehicle.id === t) ? t : out[0]?.vehicle.id ?? null));
    setDone("");
  }

  /** Kayıtlı bir ayı düzenlemek için açar */
  function open(t: TimesheetRecord) {
    setYm({ year: t.year, month: t.month });
    setHolidays(t.context.holidays);
    setSignDate(t.context.signDate);
    setSheets(t.sheets);
    setTab(t.sheets[0]?.vehicle.id ?? null);
    setDone(`${MONTHS_TR[t.month - 1]} ${t.year} kayıtlı çizelgesi açıldı.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleHoliday(day: number) {
    setHolidays((h) => {
      const next = { ...h };
      if (next[day]) delete next[day];
      else next[day] = "Resmî tatil";
      return next;
    });
    reset();
  }

  async function workbook(list: VehicleSheet[], context: MonthContext, templateId: string) {
    const { buildWorkbook } = await import("@/lib/puantaj/excel");
    return buildWorkbook(list, context, getTemplate(templateId), (p) => fetch(`/sablonlar/${p}`).then((r) => r.arrayBuffer()));
  }

  const fileName = (y: number, m: number) => `${y} ${MONTHS_TR[m - 1]} PUANTAJ${client ? ` - ${client.name}` : ""}.xlsx`;

  async function exportExcel() {
    if (!client) return;
    setBusy(true);
    setError("");
    try {
      const buf = await workbook(sheets, ctx, template.id);
      await saveTimesheet(org.id, { clientId: client.id, year, month, templateId: template.id, context: ctx, sheets });
      if (updateKm) {
        await setLastKm(client.id, sheets.map((s) => ({ vehicleId: s.vehicle.id, lastKm: totals(s, ctx).endKm })));
        await base.reload();
      }
      download(buf, fileName(year, month), XLSX_TYPE);
      await history.reload();
      setDone(`İndirildi ve kaydedildi${updateKm ? "; araçların son km bilgisi güncellendi" : ""}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const years = [year - 1, year, year + 1];
  const current = sheets.find((s) => s.vehicle.id === tab);

  if (base.data && clients.length === 0) {
    return (
      <>
        <PageHeader title="Puantaj oluştur" />
        <Card>
          <p className="text-sm text-muted">
            Önce <Link className="font-medium text-fg underline" href="/panel/kurumlar">Kurumlar</Link> sayfasından bir kurum
            ekleyin.
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Puantaj oluştur"
        text="Değerler araç ayarlarından gelir; tabloda gün gün düzeltip kurumun formatında Excel olarak indirebilirsiniz. İndirilen her ay kaydedilir."
      />
      {(error || base.error) && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error || base.error}</p>}

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="space-y-6">
          <Card title="1. Kurum ve ay">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Kurum" hint={template.name}>
                  <select
                    className={inputCls}
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      setExcluded([]);
                      reset();
                    }}
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Ay">
                <select className={inputCls} value={month} onChange={(e) => changeMonth(year, Number(e.target.value))}>
                  {MONTHS_TR.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Yıl">
                <select className={inputCls} value={year} onChange={(e) => changeMonth(Number(e.target.value), month)}>
                  {years.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="İmza tarihi">
                  <input className={inputCls} value={signDate} onChange={(e) => setSignDate(e.target.value)} />
                </Field>
              </div>
            </div>
            {saved && sheets.length === 0 && (
              <div className="mt-4 rounded-lg border border-line-strong bg-raised p-3 text-sm">
                <p>Bu ayın kayıtlı çizelgesi var.</p>
                <Button variant="secondary" className="mt-2" onClick={() => open(saved)}>
                  Kayıtlı çizelgeyi aç
                </Button>
              </div>
            )}
            <p className="mt-4 text-xs font-medium text-muted">Resmî tatiller (UBGT): eklemek ya da çıkarmak için güne tıklayın</p>
            <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs">
              {DAY_NAMES_SHORT.slice(1).concat(DAY_NAMES_SHORT[0]).map((d) => (
                <span key={d} className="text-subtle">
                  {d}
                </span>
              ))}
              {Array.from({ length: (weekday(year, month, 1) + 6) % 7 }, (_, i) => (
                <span key={`b${i}`} />
              ))}
              {Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1).map((d) => {
                const w = weekday(year, month, d);
                return (
                  <button
                    key={d}
                    title={holidays[d]}
                    onClick={() => toggleHoliday(d)}
                    className={`rounded py-1 tabular-nums ${holidays[d] ? "bg-rose-500 font-semibold text-white" : w === 0 || w === 6 ? "bg-amber-400/10 text-fg/90" : "hover:bg-white/5"}`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            {Object.entries(holidays).map(([d, n]) => (
              <p key={d} className="mt-2 text-xs text-muted">
                {d} {MONTHS_TR[month - 1]}: {n}
              </p>
            ))}
          </Card>

          <Card title="2. Araçlar">
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted">
                Bu kuruma bağlı aktif araç yok. <Link href="/panel/araclar" className="text-fg underline">Araçlar</Link>{" "}
                sayfasından araçları bu kuruma ekleyin.
              </p>
            ) : (
              <ul className="space-y-1">
                {vehicles.map((v) => (
                  <li key={v.id}>
                    <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-raised">
                      <input
                        type="checkbox"
                        checked={!excluded.includes(v.id)}
                        onChange={(e) => {
                          setExcluded((s) => (e.target.checked ? s.filter((x) => x !== v.id) : [...s, v.id]));
                          reset();
                        }}
                      />
                      <span className="font-medium">{v.plate}</span>
                      <span className="truncate text-muted">{v.kind}</span>
                      <span className="ml-auto text-xs tabular-nums text-muted">{v.lastKm.toLocaleString("tr-TR")} km</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex gap-2">
              <Button onClick={() => generate()} disabled={!selected.length} className="flex-1">
                {sheets.length ? "Yeniden oluştur" : "Çizelgeleri oluştur"}
              </Button>
              {sheets.length > 0 && (
                <Button
                  variant="secondary"
                  title="Günlük km değerlerini farklı rastgele sayılarla yeniden dağıt"
                  onClick={() => {
                    setSalt(salt + 1);
                    generate(salt + 1);
                  }}
                >
                  Km karıştır
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-subtle">Yeniden oluşturmak tablodaki elle yapılan düzeltmeleri siler.</p>
          </Card>

          {history.data && history.data.length > 0 && (
            <Card title="Kayıtlı aylar">
              <ul className="divide-y divide-line text-sm">
                {history.data.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 py-2">
                    <span className="font-medium">
                      {MONTHS_TR[t.month - 1]} {t.year}
                    </span>
                    <span className="text-xs text-subtle">{t.sheets.length} araç</span>
                    <span className="ml-auto flex gap-1">
                      <Button variant="ghost" className="px-2 py-1" onClick={() => open(t)}>
                        Aç
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-2 py-1"
                        onClick={async () => download(await workbook(t.sheets, t.context, t.templateId), fileName(t.year, t.month), XLSX_TYPE)}
                      >
                        İndir
                      </Button>
                      <Button
                        variant="danger"
                        className="px-2 py-1"
                        onClick={async () => {
                          const label = `${MONTHS_TR[t.month - 1]} ${t.year}`;
                          if (!confirm(`${label} kayıtlı çizelgesi silinsin mi?\n\nAraçların son km bilgisi değişmez; gerekirse Araçlar sayfasından düzeltin.`)) return;
                          try {
                            await deleteTimesheet(t.id);
                            await history.reload();
                            setDone(`${label} kayıtlı çizelgesi silindi.`);
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        Sil
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="min-w-0">
          {sheets.length === 0 ? (
            <Card>
              <p className="py-16 text-center text-sm text-muted">
                Kurumu, ayı ve araçları seçip <b className="text-fg">Çizelgeleri oluştur</b>&apos;a basın.
              </p>
            </Card>
          ) : (
            <Card
              title="3. Kontrol et ve indir"
              actions={
                <>
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input type="checkbox" checked={updateKm} onChange={(e) => setUpdateKm(e.target.checked)} />
                    Son km&apos;leri güncelle
                  </label>
                  <Button onClick={exportExcel} disabled={busy}>
                    {busy ? "Hazırlanıyor…" : "Kaydet ve Excel indir"}
                  </Button>
                </>
              }
            >
              {done && <p className="mb-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{done}</p>}
              <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
                {sheets.map((s) => (
                  <button
                    key={s.vehicle.id}
                    onClick={() => setTab(s.vehicle.id)}
                    className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === s.vehicle.id ? "border-brand font-medium" : "border-transparent text-muted hover:text-fg"}`}
                  >
                    {s.vehicle.plate}
                  </button>
                ))}
              </div>
              {current && (
                <>
                  <p className="mb-4 text-sm text-muted">
                    {current.vehicle.brand} {current.vehicle.kind} · {current.vehicle.poz} ·{" "}
                    {current.vehicle.drivers.map((d) => d.name).filter(Boolean).join(", ") || "sürücü atanmamış"}
                  </p>
                  <SheetEditor
                    sheet={current}
                    ctx={ctx}
                    onChange={(s) => setSheets((all) => all.map((x) => (x.vehicle.id === s.vehicle.id ? s : x)))}
                  />
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
