"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { InformationCircleIcon, ArrowPathIcon, PencilIcon, TrashIcon, ArrowsUpDownIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import KpiCard from "@/app/components/KpiCard";

type NatureActe =
  | "coll an santé"
  | "coll an prev"
  | "coll an retraite"
  | "coll adhésion / renfort"
  | "coll révision"
  | "ind an santé"
  | "ind an prev"
  | "ind an retraite"
  | "courtage → allianz (ind & coll)"
  | "allianz → court (ind & coll)";

type Origine = "proactif" | "réactif" | "prospection";
type Compagnie = "allianz" | "courtage";

type Entry = {
  id: string;
  dayIso: string; // YYYY-MM-DD (saisie auto)
  createdAtIso: string; // ISO
  nature: NatureActe;
  origine: Origine;
  compagnie: Compagnie;
  client: string;
  contractNumber?: string;
  primeBrute: number; // € entier
  primePonderee: number; // € entier
};

const NATURES: NatureActe[] = [
  "coll an santé",
  "coll an prev",
  "coll an retraite",
  "coll adhésion / renfort",
  "coll révision",
  "ind an santé",
  "ind an prev",
  "ind an retraite",
  "courtage → allianz (ind & coll)",
  "allianz → court (ind & coll)",
];

const ORIGINES: Origine[] = ["proactif", "réactif", "prospection"];
const COMPAGNIES: Compagnie[] = ["allianz", "courtage"];

const STORAGE_KEY = "cdc_sante_coll_entries";

function toYearMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function toDayIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function computePonderee(primeBrute: number, origine: Origine): number {
  const taux = origine === "proactif" ? 1 : origine === "réactif" ? 0.5 : 1.2;
  return Math.round((primeBrute || 0) * taux);
}

function commissionRate(totalPondere: number): number {
  if (totalPondere >= 18001) return 0.06;
  if (totalPondere >= 14001) return 0.04;
  if (totalPondere >= 10001) return 0.03;
  if (totalPondere >= 6001) return 0.02;
  return 0;
}

export default function CdcSanteCollPage() {
  const router = useRouter();
  useEffect(() => {
    const s = getCurrentSession();
    if (!s) { router.replace("/login"); return; }
    const normalized = s.role
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");
    if (!normalized.includes("cdc_sante_coll")) router.replace("/dashboard");
  }, [router]);

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());
  const monthKey = useMemo(() => toYearMonthKey(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1)), [currentMonthDate]);
  const totalDaysInMonth = useMemo(() => new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate(), [currentMonthDate]);
  const dayIsosInMonth = useMemo(() => Array.from({ length: totalDaysInMonth }, (_, i) => toDayIso(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), i + 1))), [currentMonthDate, totalDaysInMonth]);

  const [entries, setEntries] = useState<Entry[]>([]);
  useEffect(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) setEntries(JSON.parse(raw)); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
  }, [entries]);

  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);
  const [filterNature, setFilterNature] = useState<NatureActe | "ALL">("ALL");
  const [filterOrigine, setFilterOrigine] = useState<Origine | "ALL">("ALL");
  const [isMonthLocked] = useState<boolean>(false); // branchement admin à venir

  const handleResetFilters = useCallback(() => {
    setSelectedDayIso(null);
    setFilterNature("ALL");
    setFilterOrigine("ALL");
  }, []);

  const filteredEntries = useMemo(() => entries.filter(e => {
    if (!e.dayIso.startsWith(monthKey)) return false;
    if (selectedDayIso && e.dayIso !== selectedDayIso) return false;
    if (filterNature !== "ALL" && e.nature !== filterNature) return false;
    if (filterOrigine !== "ALL" && e.origine !== filterOrigine) return false;
    return true;
  }), [entries, monthKey, selectedDayIso, filterNature, filterOrigine]);

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    dayIsosInMonth.forEach((d) => map.set(d, 0));
    for (const e of filteredEntries) map.set(e.dayIso, (map.get(e.dayIso) || 0) + 1);
    return map;
  }, [filteredEntries, dayIsosInMonth]);

  const kpis = useMemo(() => {
    const month = entries.filter(e => e.dayIso.startsWith(monthKey));
    const totalActs = month.length;
    const caBrut = month.reduce((s, e) => s + (e.primeBrute || 0), 0);
    const caPondere = month.reduce((s, e) => s + (e.primePonderee || 0), 0);
    const rate = commissionRate(caPondere);
    const commission = Math.round(caPondere * rate);
    const euro = (n: number) => `${n.toLocaleString("fr-FR")} €`;
    return { totalActs, caBrut: euro(caBrut), caPondere: euro(caPondere), commission: euro(commission), rateLabel: `${Math.round(rate*100)} %` };
  }, [entries, monthKey]);

  const [kpiInfo, setKpiInfo] = useState<{ open: boolean; title: string; body: string }>({ open: false, title: "", body: "" });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ nature: NatureActe; origine: Origine; compagnie: Compagnie; client: string; contract?: string; primeBrute?: number }>({ nature: NATURES[0], origine: "proactif", compagnie: "allianz", client: "" });
  const canSubmit = useMemo(() => !!form.client.trim() && typeof form.primeBrute === "number" && form.primeBrute > 0, [form]);

  function normalizeClientName(value: string): string {
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (!trimmed) return trimmed;
    const spaceIdx = trimmed.indexOf(" ");
    const first = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
    const rest = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx);
    return first.charAt(0).toUpperCase() + first.slice(1) + rest;
  }

  const submit = () => {
    const today = new Date();
    const primePonderee = computePonderee(form.primeBrute || 0, form.origine);
    if (editingId) {
      setEntries(prev => prev.map(e => e.id === editingId ? { ...e, nature: form.nature, origine: form.origine, compagnie: form.compagnie, client: normalizeClientName(form.client), contractNumber: form.contract?.trim() || undefined, primeBrute: Math.round(form.primeBrute || 0), primePonderee } : e));
    } else {
      const entry: Entry = {
        id: Math.random().toString(36).slice(2, 10),
        dayIso: toDayIso(today),
        createdAtIso: today.toISOString(),
        nature: form.nature,
        origine: form.origine,
        compagnie: form.compagnie,
        client: normalizeClientName(form.client),
        contractNumber: form.contract?.trim() || undefined,
        primeBrute: Math.round(form.primeBrute || 0),
        primePonderee,
      };
      setEntries(prev => [entry, ...prev]);
    }
    setShowModal(false);
    setEditingId(null);
    setForm({ nature: form.nature, origine: form.origine, compagnie: form.compagnie, client: "" });
  };

  return (
    <div className="space-y-4">
      <div className="hero">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title">Santé collective</h1>
            <p className="subtle text-sm">Suivi de la production mensuelle</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" onClick={() => setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>◀</button>
            <span className="badge badge-strong" title={monthKey}>{currentMonthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
            <button className="btn btn-ghost" onClick={() => setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>▶</button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <KpiCard title="Actes" value={kpis.totalActs} gradient="grad-pink" onInfo={() => setKpiInfo({ open: true, title: "Actes", body: "Total des actes saisis dans le mois." })} />
          <KpiCard title="CA brut" value={kpis.caBrut} gradient="grad-amber" onInfo={() => setKpiInfo({ open: true, title: "CA brut", body: "Somme des primes brutes du mois." })} />
          <KpiCard title="CA pondéré" value={kpis.caPondere} gradient="grad-sky" onInfo={() => setKpiInfo({ open: true, title: "CA pondéré", body: "Somme des primes pondérées du mois. Calcul: primePondérée = arrondiEuro(primeBrute × tauxOrigine). Taux: Proactif 100 %, Réactif 50 %, Prospection 120 %." })} />
          <KpiCard title={`Commission (taux ${kpis.rateLabel})`} value={kpis.commission} gradient="grad-emerald" onInfo={() => setKpiInfo({ open: true, title: "Commission", body: "Commission estimée selon le barème sur CA pondéré du mois (taux appliqué dès le 1er euro)." })} />
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl p-3 bg-white/15 backdrop-blur-md border border-white/20 flex items-center gap-2">
            <button className="btn px-4" onClick={handleResetFilters}><ArrowPathIcon className="w-4 h-4 mr-1"/> Reset</button>
            <select className="input" value={filterOrigine} onChange={e => setFilterOrigine(e.target.value as any)}>
              <option value="ALL">Origine: Toutes</option>
              {ORIGINES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="input" value={filterNature} onChange={e => setFilterNature(e.target.value as any)}>
              <option value="ALL">Nature: Toutes</option>
              {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="rounded-xl p-3 bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-end gap-2">
            <button className="btn btn-ghost text-sm" onClick={() => {
              const header = ["day","nature","origine","compagnie","client","contract","primeBrute","primePonderee"]; 
              const rows = entries.filter(e=>e.dayIso.startsWith(monthKey)).map(e => [e.dayIso, e.nature, e.origine, e.compagnie, e.client, e.contractNumber||"", e.primeBrute, e.primePonderee]);
              const csv = [header, ...rows].map(r=>r.join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `sante-coll-${monthKey}.csv`; a.click(); URL.revokeObjectURL(url);
            }}>Export CSV</button>
            <span className={`badge ${!isMonthLocked?"bg-emerald-500/20":"bg-amber-500/20"}`}><ShieldCheckIcon className="w-4 h-4"/> {!isMonthLocked?"Débloqué":"Verrou"}</span>
            <button className="btn btn-primary" onClick={() => { setEditingId(null); setShowModal(true); }} disabled={isMonthLocked}>Nouvel acte</button>
          </div>
        </div>

        <div className="mt-3 relative overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${totalDaysInMonth}, minmax(28px,1fr))` }}>
            {dayIsosInMonth.map((dIso, idx) => {
              const dayNum = idx + 1;
              const count = countsByDay.get(dIso) || 0;
              const dow = new Date(dIso).getDay();
              const active = selectedDayIso === dIso;
              const baseColor =
                dow === 0 ? (count === 0 ? "bg-red-500" : count < 3 ? "bg-red-600" : "bg-red-700")
                : dow === 6 ? (count === 0 ? "bg-orange-500" : count < 3 ? "bg-orange-600" : "bg-orange-700")
                : (count === 0 ? "bg-emerald-200 text-emerald-900" : count < 3 ? "bg-emerald-500 text-white" : "bg-emerald-600 text-white");
              return (
                <div key={dIso} className="relative flex flex-col items-center">
                  <button className={`h-8 w-full rounded-full text-xs flex items-center justify-center border ${active ? "ring-2 ring-white scale-105 shadow " : ""} ${baseColor}`} onClick={() => setSelectedDayIso(p => p===dIso?null:dIso)} title={`${dayNum}/${currentMonthDate.getMonth()+1}: ${count} saisie(s)`}>
                    {count}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title mb-2">Saisies du mois</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px] table-auto border-separate border-spacing-y-1">
            <thead className="sticky top-0 z-10 bg-white/85 dark:bg-black/40 backdrop-blur-md border-b-2 border-black/15">
              <tr>
                <th className="py-2.5 px-3 text-center font-semibold tracking-wide">Jour</th>
                <th className="py-2.5 px-3 text-left font-semibold tracking-wide">Nature</th>
                <th className="py-2.5 px-3 text-center font-semibold tracking-wide">Origine</th>
                <th className="py-2.5 px-3 text-center font-semibold tracking-wide">Compagnie</th>
                <th className="py-2.5 px-3 text-left font-semibold tracking-wide">Client</th>
                <th className="py-2.5 px-3 text-center font-semibold tracking-wide">N° contrat</th>
                <th className="py-2.5 px-3 text-right font-semibold tracking-wide">Prime brute</th>
                <th className="py-2.5 px-3 text-right font-semibold tracking-wide">Prime pondérée</th>
                <th className="py-2.5 px-3 text-center font-semibold tracking-wide">Actions</th>
                <th className="py-2.5 px-3 text-center font-semibold tracking-wide">Verrou</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filteredEntries.map(e => (
                <tr key={e.id} className="odd:bg-white/60 even:bg-white/40 dark:odd:bg-white/10 dark:even:bg-white/5">
                  <td className="py-2.5 px-3 whitespace-nowrap text-center">{e.dayIso}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-left">{e.nature}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-center">{e.origine}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-center">{e.compagnie}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-left">{e.client}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-center">{e.contractNumber || "—"}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-right">{e.primeBrute.toLocaleString("fr-FR")} €</td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-right">{e.primePonderee.toLocaleString("fr-FR")} €</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 justify-center">
                      <button className="btn text-sm text-white bg-emerald-500 hover:brightness-110" title="Éditer" disabled={isMonthLocked} onClick={() => { setEditingId(e.id); setForm({ nature: e.nature, origine: e.origine, compagnie: e.compagnie, client: e.client, contract: e.contractNumber, primeBrute: e.primeBrute }); setShowModal(true); }}>
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button className="btn text-sm text-white bg-rose-500 hover:brightness-110" title="Supprimer" disabled={isMonthLocked} onClick={() => setEntries(prev => prev.filter(x => x.id !== e.id))}>
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-center">
                    <svg className={`w-5 h-5 ${!isMonthLocked ? 'text-emerald-500' : 'text-red-500'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      {!isMonthLocked ? (
                        <>
                          <path d="M7 10V7a5 5 0 0 1 9.17-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                        </>
                      ) : (
                        <>
                          <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                        </>
                      )}
                    </svg>
                  </td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td className="p-3 text-center subtle" colSpan={10}>Aucune saisie pour les filtres actuels.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {kpiInfo.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55">
          <div className="modal-card w-full max-w-md">
            <div className="modal-accent bg-gradient-to-r from-sky-500 to-cyan-400" />
            <div className="flex items-start justify-between mb-2">
              <h3 className="modal-title">{kpiInfo.title}</h3>
              <button className="btn btn-ghost" onClick={() => setKpiInfo({ open: false, title: "", body: "" })}>Fermer</button>
            </div>
            <div className="modal-body">
              {kpiInfo.title === "CA pondéré" ? (
                <>
                  <p>Somme des primes pondérées du mois.</p>
                  <p><b>Calcul</b></p>
                  <p>primePondérée = arrondiEuro(primeBrute × tauxOrigine)</p>
                  <p><b>Taux d'origine</b></p>
                  <ul>
                    <li>Proactif: 100 %</li>
                    <li>Réactif: 50 %</li>
                    <li>Prospection: 120 %</li>
                  </ul>
                </>
              ) : kpiInfo.title === "Commission" ? (
                <>
                  <p>Commission estimée selon le barème appliqué au <b>CA pondéré</b> du mois.</p>
                  <p><b>Barème (taux appliqué dès le 1er euro)</b></p>
                  <div className="overflow-hidden rounded-lg border border-black/10">
                    <table className="w-full text-sm">
                      <thead className="bg-white/70 dark:bg-white/10">
                        <tr>
                          <th className="text-left px-3 py-2">Seuil pondéré (mois)</th>
                          <th className="text-right px-3 py-2">Taux</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-black/10">
                          <td className="px-3 py-2">0 → 6 000 €</td>
                          <td className="px-3 py-2 text-right">0 %</td>
                        </tr>
                        <tr className="border-t border-black/10">
                          <td className="px-3 py-2">6 001 → 10 000 €</td>
                          <td className="px-3 py-2 text-right">2 %</td>
                        </tr>
                        <tr className="border-t border-black/10">
                          <td className="px-3 py-2">10 001 → 14 000 €</td>
                          <td className="px-3 py-2 text-right">3 %</td>
                        </tr>
                        <tr className="border-t border-black/10">
                          <td className="px-3 py-2">14 001 → 18 000 €</td>
                          <td className="px-3 py-2 text-right">4 %</td>
                        </tr>
                        <tr className="border-t border-black/10">
                          <td className="px-3 py-2">≥ 18 001 €</td>
                          <td className="px-3 py-2 text-right">6 %</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p>Exemples: 15 000 € → 4 % sur tout; 23 000 € → 6 % sur tout.</p>
                </>
              ) : (
                <p>{kpiInfo.body}</p>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setKpiInfo({ open: false, title: "", body: "" })}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55">
          <div className="modal-card w-full max-w-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="modal-title">Nouvel acte</h3>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Fermer</button>
            </div>
            <div className="grid gap-3">
              <div className="text-xs subtle">Date de saisie (auto): {new Date().toLocaleString()}</div>
              <label className="grid gap-1">
                <span className="text-sm">Nature</span>
                <select className="input" value={form.nature} onChange={e => setForm(f => ({ ...f, nature: e.target.value as NatureActe }))}>{NATURES.map(n => <option key={n} value={n}>{n}</option>)}</select>
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Origine</span>
                <select className="input" value={form.origine} onChange={e => setForm(f => ({ ...f, origine: e.target.value as Origine }))}>{ORIGINES.map(o => <option key={o} value={o}>{o}</option>)}</select>
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Compagnie</span>
                <select className="input" value={form.compagnie} onChange={e => setForm(f => ({ ...f, compagnie: e.target.value as Compagnie }))}>{COMPAGNIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Nom du client</span>
                <input className="input" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} onBlur={e => setForm(f => ({ ...f, client: normalizeClientName(e.target.value) }))} />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">N° contrat (optionnel)</span>
                <input className="input" value={form.contract || ""} onChange={e => setForm(f => ({ ...f, contract: e.target.value }))} />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Prime brute (€ entier)</span>
                <input className="input" type="number" inputMode="numeric" step="1" min="0" value={form.primeBrute ?? ""} onChange={e => setForm(f => ({ ...f, primeBrute: e.target.value === "" ? undefined : Number(e.target.value) }))} />
              </label>
              <div className="text-sm">Prime pondérée: {computePonderee(form.primeBrute || 0, form.origine).toLocaleString("fr-FR")} €</div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="btn btn-primary" disabled={!canSubmit} onClick={submit}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


