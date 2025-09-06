"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { DocumentPlusIcon, Cog6ToothIcon, CurrencyEuroIcon, AdjustmentsVerticalIcon, InformationCircleIcon, ShieldCheckIcon, ArrowPathIcon, ArrowsUpDownIcon, RocketLaunchIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

// Helpers reused from commercial page style
function toYearMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function toDayIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Santé Individuelle: actes
type ActKind = "Affaire nouvelle" | "Révision" | "Adhésion groupe" | "Courtage → Allianz" | "Allianz → Courtage";
type ActFilter = "ALL" | ActKind;

type SanteEntry = {
  id: string;
  act: ActKind;
  clientName: string;
  contractNumber: string;
  effectiveDateIso: string; // date d'effet
  caEur: number; // entier
  caPondereEur: number; // entier
  createdAtIso: string; // horodatage de saisie
  dayIso: string; // jour d'appartenance
  company?: "Allianz" | "Courtage"; // seulement pour "Affaire nouvelle"
  authorEmail?: string;
};

const ACTS: ActKind[] = [
  "Affaire nouvelle",
  "Révision",
  "Adhésion groupe",
  "Courtage → Allianz",
  "Allianz → Courtage",
];

function actGradient(a: ActKind): string {
  switch (a) {
    case "Affaire nouvelle":
      return "bg-gradient-to-r from-pink-500 to-fuchsia-500";
    case "Révision":
      return "bg-gradient-to-r from-indigo-500 to-purple-500";
    case "Adhésion groupe":
      return "bg-gradient-to-r from-emerald-500 to-teal-500";
    case "Courtage → Allianz":
      return "bg-gradient-to-r from-amber-500 to-orange-500";
    case "Allianz → Courtage":
      return "bg-gradient-to-r from-sky-500 to-cyan-400";
    default:
      return "bg-slate-500";
  }
}

function normalizeClientName(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr-FR");
  const capitalizeSegment = (seg: string) => (seg ? seg.charAt(0).toLocaleUpperCase("fr-FR") + seg.slice(1) : seg);
  const capitalizeWord = (word: string) =>
    word
      .split(/([’'])/)
      .map((piece) => (piece === "'" || piece === "’" ? piece : capitalizeSegment(piece)))
      .join("");
  return cleaned
    .split(" ")
    .map((w) => w.split("-").map(capitalizeWord).join("-"))
    .join(" ");
}

// Live formatting during typing: keep a trailing space if user just typed it
function normalizeClientNameLive(value: string): string {
  const hadTrailingSpace = /\s$/.test(value);
  // collapse consecutive spaces, remove leading spaces but keep potential single trailing space
  const leftTrimmed = value.replace(/^\s+/, "");
  const collapsed = leftTrimmed.replace(/\s{2,}/g, " ");
  const strict = normalizeClientName(collapsed);
  return hadTrailingSpace ? strict + " " : strict;
}

// CA → CA pondéré
function actWeight(a: ActKind): number {
  switch (a) {
    case "Affaire nouvelle":
      return 1.0;
    case "Révision":
    case "Adhésion groupe":
    case "Allianz → Courtage":
      return 0.5;
    case "Courtage → Allianz":
      return 0.75;
  }
}

function computePondere(caEur: number, act: ActKind): number {
  const w = actWeight(act);
  return Math.round(Math.max(0, caEur) * w);
}

// Commission rate tiers based on monthly CA pondéré
function commissionRateFromPondere(monthTotalPondere: number): number {
  if (monthTotalPondere < 10000) return 0.0;
  if (monthTotalPondere < 14000) return 0.02;
  if (monthTotalPondere < 18000) return 0.03;
  if (monthTotalPondere < 22000) return 0.04;
  return 0.06;
}

// Small lock icon like commercial page
function LockSvg({ open }: { open: boolean }) {
  const colorClass = open ? "text-emerald-500" : "text-red-500";
  return (
    <svg className={"w-5 h-5 " + colorClass} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {open ? (
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
  );
}

export default function CdcSanteIndPage() {
  const router = useRouter();

  // Auth guard for role `CDC_sante_ind` (admin also allowed)
  useEffect(() => {
    const session = getCurrentSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const normalized = session.role
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const isAdmin = normalized.includes("administrateur");
    if (!normalized.includes("cdc_sante_ind") && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [router]);

  // Month navigation
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const monthKey = useMemo(() => toYearMonthKey(currentMonthDate), [currentMonthDate]);
  const totalDaysInMonth = useMemo(() => new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate(), [currentMonthDate]);
  const dayIsosInMonth = useMemo(() => Array.from({ length: totalDaysInMonth }, (_, i) => toDayIso(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), i + 1))), [currentMonthDate, totalDaysInMonth]);

  const goPrevMonth = useCallback(() => setCurrentMonthDate((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1)), []);
  const goNextMonth = useCallback(() => setCurrentMonthDate((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1)), []);

  // Month lock (admin later)
  const [isMonthLocked] = useState<boolean>(false);

  // Entries persistence
  const STORAGE_KEY = "cdc_sante_entries";
  const [entries, setEntries] = useState<SanteEntry[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {}
  }, [entries]);

  // Modal state
  const [pendingAct, setPendingAct] = useState<ActKind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ clientName: string; contractNumber: string; effectiveDateIso: string; caEur: string; company?: "Allianz" | "Courtage" }>(() => ({ clientName: "", contractNumber: "", effectiveDateIso: toDayIso(new Date()), caEur: "" }));
  const canSubmit = useMemo(() => {
    if (!pendingAct) return false;
    const baseOk = form.clientName.trim() && form.contractNumber.trim() && form.effectiveDateIso && form.caEur !== "" && Number(form.caEur) >= 0;
    if (pendingAct === "Affaire nouvelle") return !!baseOk && !!form.company;
    return !!baseOk;
  }, [pendingAct, form]);

  const generateId = () => Math.random().toString(36).slice(2, 10);

  const submitAct = () => {
    if (!pendingAct || isMonthLocked) return;
    const today = new Date();
    const ca = Math.max(0, Math.floor(Number(form.caEur)) || 0);
    const current = getCurrentSession();
    const entry: SanteEntry = {
      id: editingId ?? generateId(),
      act: pendingAct,
      clientName: normalizeClientName(form.clientName),
      contractNumber: form.contractNumber,
      effectiveDateIso: form.effectiveDateIso,
      caEur: ca,
      caPondereEur: computePondere(ca, pendingAct),
      createdAtIso: today.toISOString(),
      dayIso: toDayIso(today),
      company: pendingAct === "Affaire nouvelle" ? form.company : undefined,
      authorEmail: current?.email || "unknown",
    };
    setEntries((prev) => {
      if (!editingId) return [entry, ...prev];
      return prev.map((e) => (e.id === editingId ? entry : e));
    });
    setPendingAct(null);
    setEditingId(null);
    setForm((f) => ({ ...f, clientName: "", contractNumber: "", caEur: "", company: undefined }));
  };

  // Derived rows for month
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const monthRows = useMemo(() => {
    const rows = entries.filter((e) => e.dayIso.startsWith(monthKey));
    rows.sort((a, b) => (sortAsc ? 1 : -1) * (a.dayIso === b.dayIso ? a.createdAtIso.localeCompare(b.createdAtIso) : a.dayIso.localeCompare(b.dayIso)));
    return rows;
  }, [entries, monthKey, sortAsc]);

  // Timeline counts
  const [actFilter, setActFilter] = useState<ActFilter>("ALL");
  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    dayIsosInMonth.forEach((d) => map.set(d, 0));
    for (const e of entries) {
      if (!e.dayIso.startsWith(monthKey)) continue;
      if (actFilter !== "ALL" && e.act !== actFilter) continue;
      map.set(e.dayIso, (map.get(e.dayIso) || 0) + 1);
    }
    return map;
  }, [entries, dayIsosInMonth, monthKey, actFilter]);
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);
  const [kpiInfo, setKpiInfo] = useState<{ open: boolean; title: string; body: string }>({ open: false, title: "", body: "" });
  const tableRows = useMemo(() => (selectedDayIso ? monthRows.filter((r) => r.dayIso === selectedDayIso) : monthRows), [monthRows, selectedDayIso]);
  const filteredTableRows = useMemo(() => tableRows.filter((r) => (actFilter === "ALL" ? true : r.act === actFilter)), [tableRows, actFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const subset = entries.filter((e) => e.dayIso.startsWith(monthKey));
    const totalBrut = subset.reduce((acc, e) => acc + e.caEur, 0);
    const totalPondere = subset.reduce((acc, e) => acc + e.caPondereEur, 0);
    const revisions = subset.filter((e) => e.act === "Révision").length;
    const rate = commissionRateFromPondere(totalPondere);
    const commissionBase = Math.round(totalPondere * rate);
    const eligibleQuali = revisions >= 4;
    const commissionFinale = eligibleQuali ? commissionBase : 0;
    const euro = (n: number) => `${n.toLocaleString("fr-FR")} €`;
    return {
      totalBrutLabel: euro(totalBrut),
      totalPondereLabel: euro(totalPondere),
      tauxLabel: `${Math.round(rate * 100)} %`,
      commissionBaseLabel: euro(commissionBase),
      commissionFinaleLabel: euro(commissionFinale),
      revisions,
      eligibleQuali,
    };
  }, [entries, monthKey]);

  // UI
  return (
    <div className="space-y-4">
      <div className="hero">
        {/* Header + month nav */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title">Santé individuelle — Production</h1>
            <p className="subtle text-sm">Déclaration et suivi mensuels</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" onClick={goPrevMonth} title="Mois précédent">◀</button>
            <span className="badge" title={monthKey}>{currentMonthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
            <button className="btn btn-ghost" onClick={goNextMonth} title="Mois suivant">▶</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-2xl p-3 border border-white/20 dark:border-white/15 bg-white/10 dark:bg-black/20 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2">
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-r from-amber-500 to-orange-500">
                <CurrencyEuroIcon className="w-5 h-5" />
              </div>
              <div className="text-[11px] subtle">CA brut mensuel</div>
              <button className="ml-auto btn btn-ghost p-1 rounded-full bg-white/30 dark:bg-white/10" title="À propos" onClick={() => setKpiInfo({ open: true, title: "CA brut mensuel", body: "Somme des CA saisis (tous actes) sur le mois affiché. Montants en euros entiers." })}>
                <InformationCircleIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 text-3xl font-semibold text-center leading-none">{kpis.totalBrutLabel}</div>
          </div>
          <div className="rounded-2xl p-3 border border-white/20 dark:border-white/15 bg-white/10 dark:bg-black/20 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2">
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-r from-emerald-500 to-teal-500">
                <AdjustmentsVerticalIcon className="w-5 h-5" />
              </div>
              <div className="text-[11px] subtle">CA pondéré mensuel</div>
              <button className="ml-auto btn btn-ghost p-1 rounded-full bg-white/30 dark:bg-white/10" title="À propos" onClick={() => setKpiInfo({ open: true, title: "CA pondéré", body: "Somme des CA × pondération (AN 100%, Révision/Adhésion 50%, Courtage→Allianz 75%, Allianz→Courtage 50%)." })}>
                <InformationCircleIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 text-3xl font-semibold text-center leading-none">{kpis.totalPondereLabel}</div>
          </div>
          <div className="rounded-2xl p-3 border border-white/20 dark:border-white/15 bg-white/10 dark:bg-black/20 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2">
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-r from-sky-500 to-cyan-400">
                <RocketLaunchIcon className="w-5 h-5" />
              </div>
              <div className="text-[11px] subtle">Taux commission (palier)</div>
              <button className="ml-auto btn btn-ghost p-1 rounded-full bg-white/30 dark:bg-white/10" title="À propos" onClick={() => setKpiInfo({ open: true, title: "Taux commission", body: "Taux appliqué selon paliers de CA pondéré mensuel: <10k=0%, <14k=2%, <18k=3%, <22k=4%, ≥22k=6%." })}>
                <InformationCircleIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 text-3xl font-semibold text-center leading-none">{kpis.tauxLabel}</div>
          </div>
          <div className="relative rounded-2xl p-3 border border-white/20 dark:border-white/15 bg-white/10 dark:bg-black/20 backdrop-blur-md shadow-sm">
            <div className={`absolute inset-0 rounded-2xl -z-10 ${kpis.eligibleQuali ? "bg-gradient-to-r from-lime-500/25 to-emerald-500/25" : "bg-gradient-to-r from-rose-500/20 to-red-500/25"}`} />
            <div className="flex items-center gap-2">
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${kpis.eligibleQuali ? "bg-gradient-to-r from-lime-500 to-emerald-500" : "bg-gradient-to-r from-rose-500 to-red-500"}`}>
                <CurrencyEuroIcon className="w-5 h-5" />
              </div>
              <div className="text-[11px] subtle">Commission estimée</div>
              <button className="ml-auto btn btn-ghost p-1 rounded-full bg-white/30 dark:bg-white/10" title="À propos" onClick={() => setKpiInfo({ open: true, title: "Commission estimée", body: "Le montant affiché est la commission estimée = CA pondéré × taux (paliers). Si le critère qualitatif (≥ 4 révisions/mois) est atteint, la commission est payable; sinon elle reste estimative (non payable)." })}>
                <InformationCircleIcon className="w-4 h-4" />
              </button>
            </div>
            <div className={`mt-2 text-3xl font-semibold text-center leading-none ${kpis.eligibleQuali ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{kpis.commissionBaseLabel}</div>
            <div className="text-[11px] subtle mt-1 text-center">
              {kpis.eligibleQuali ? (
                <span className="inline-flex items-center gap-1"><ShieldCheckIcon className="w-4 h-4 text-emerald-500" /> Payable: {kpis.commissionBaseLabel}</span>
              ) : (
                <span className="inline-flex items-center gap-1"><ShieldCheckIcon className="w-4 h-4 text-red-500" /> Critère quali manquant — non payable</span>
              )}
            </div>
          </div>
        </div>

        {kpiInfo.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="card w-full max-w-md bg-white dark:bg-black">
              <div className="flex items-center justify-between mb-2">
                <h3 className="section-title">{kpiInfo.title}</h3>
                <button className="btn btn-ghost" onClick={() => setKpiInfo({ open: false, title: "", body: "" })}>Fermer</button>
              </div>
              {kpiInfo.title === "Taux commission" ? (
                <div className="text-sm text-black/80 dark:text-white/90 space-y-3">
                  <p>Le taux est déterminé par le CA pondéré mensuel atteint. Le palier atteint s’applique <b>dès le 1er euro</b> du mois.</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr>
                          <th className="p-2 text-left">Palier (CA pondéré mensuel)</th>
                          <th className="p-2 text-right">Taux</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-black/10 dark:border-white/10">
                          <td className="p-2">Moins de 10 000 €</td>
                          <td className="p-2 text-right">0 %</td>
                        </tr>
                        <tr className="border-t border-black/10 dark:border-white/10">
                          <td className="p-2">10 000 € à &lt; 14 000 €</td>
                          <td className="p-2 text-right">2 %</td>
                        </tr>
                        <tr className="border-t border-black/10 dark:border-white/10">
                          <td className="p-2">14 000 € à &lt; 18 000 €</td>
                          <td className="p-2 text-right">3 %</td>
                        </tr>
                        <tr className="border-t border-black/10 dark:border-white/10">
                          <td className="p-2">18 000 € à &lt; 22 000 €</td>
                          <td className="p-2 text-right">4 %</td>
                        </tr>
                        <tr className="border-t border-black/10 dark:border-white/10">
                          <td className="p-2">22 000 € et plus</td>
                          <td className="p-2 text-right">6 %</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs opacity-80">Exemple: pour 19 000 € de CA pondéré, le taux est 4 % et s’applique sur la totalité du CA pondéré du mois.</p>
                </div>
              ) : (
                <p className="text-sm text-black/80 dark:text-white/90">{kpiInfo.body}</p>
              )}
              <div className="mt-4 flex justify-end">
                <button className="btn btn-primary" onClick={() => setKpiInfo({ open: false, title: "", body: "" })}>OK</button>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`btn px-4 ${actFilter === "ALL" ? "text-white bg-gradient-to-r from-slate-600 to-slate-400" : "btn-ghost"}`}
              onClick={() => setActFilter("ALL")}
              title="Tous les actes"
            >
              Tous
            </button>
            {ACTS.map((a) => (
              <button
                key={a}
                className={`btn px-4 text-white ${actFilter === a ? actGradient(a) : "btn-ghost"}`}
                onClick={() => setActFilter(a)}
                title={a}
              >
                {a}
              </button>
            ))}
            <button className="btn px-4 btn-ghost" onClick={() => { setActFilter("ALL"); setSelectedDayIso(null); }} title="Réinitialiser filtres et jour">
              <ArrowPathIcon className="w-4 h-4 mr-1" /> Reset
            </button>
            <span className="subtle text-sm">Révisions ce mois: {kpis.revisions}</span>
          </div>
          <div className="relative overflow-x-auto">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${totalDaysInMonth}, minmax(28px,1fr))` }}>
              {dayIsosInMonth.map((dIso, idx) => {
                const dayNum = idx + 1;
                const count = countsByDay.get(dIso) || 0;
                const active = selectedDayIso === dIso;
                const isToday = dIso === toDayIso(new Date());
                const dow = new Date(dIso).getDay(); // 0 = dim, 6 = sam
                // Colors: dimanche rouge, samedi orange, autres verts (intensité selon count)
                const baseColor =
                  dow === 0
                    ? count === 0
                      ? "bg-red-300 text-white"
                      : count < 3
                      ? "bg-red-400 text-white"
                      : "bg-red-600 text-white"
                    : dow === 6
                    ? count === 0
                      ? "bg-orange-300 text-white"
                      : count < 3
                      ? "bg-orange-400 text-white"
                      : "bg-orange-600 text-white"
                    : count === 0
                    ? "bg-emerald-300 text-white"
                    : count < 3
                    ? "bg-emerald-400 text-white"
                    : "bg-emerald-600 text-white";
                return (
                  <div key={dIso} className="relative flex flex-col items-center">
                    <button className={"h-8 w-full rounded-full text-xs flex items-center justify-center border " + (active ? "ring-2 ring-white scale-105 shadow " : "") + baseColor} title={`${dayNum}: ${count} acte(s)`} onClick={() => setSelectedDayIso((prev) => (prev === dIso ? null : dIso))}>
                      {count === 0 ? "0" : count}
                      {isToday && <span className="sr-only">Aujourd'hui</span>}
                    </button>
                    {isToday && <span className="mt-0.5 h-1 w-4 rounded-full bg-sky-400"></span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Table + action buttons */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="section-title">Production du mois</h2>
          <div className="flex items-center gap-3">
            <span className={`badge ${kpis.eligibleQuali ? "bg-emerald-500/20" : "bg-amber-500/20"}`} title="Éligibilité qualitative (≥4 révisions)">
              <ShieldCheckIcon className="w-4 h-4" /> {kpis.eligibleQuali ? "Quali OK" : "Quali manquant"}
            </span>
            <button className="btn btn-ghost text-sm" onClick={() => setSortAsc((v) => !v)} title="Inverser l'ordre">
              <ArrowsUpDownIcon className="w-4 h-4 mr-1" /> {sortAsc ? "Ancien → Récent" : "Récent → Ancien"}
            </button>
            <span className="subtle text-sm">{tableRows.length} ligne(s)</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="mb-3 sticky top-2 z-10 bg-white/60 dark:bg-black/30 backdrop-blur-md p-2 rounded-xl">
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-5 gap-2 justify-items-center">
            {ACTS.map((a) => (
              <button key={a} className={`btn px-5 py-2 text-sm text-white shadow-lg hover:brightness-110 ${actGradient(a)} w-full justify-center`} onClick={() => setPendingAct(a)} disabled={isMonthLocked}>
                {a === "Affaire nouvelle" ? <DocumentPlusIcon className="w-4 h-4 mr-1" /> : <Cog6ToothIcon className="w-4 h-4 mr-1" />}
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white/80 dark:bg-black/40 backdrop-blur-md">
              <tr>
                <th className="p-2 text-center">Jour</th>
                <th className="p-2 text-center">Acte</th>
                <th className="p-2 text-center">Compagnie</th>
                <th className="p-2 text-center">N° contrat</th>
                <th className="p-2 text-center">Date d'effet</th>
                <th className="p-2 text-center">Client</th>
                <th className="p-2 text-center">CA (€)</th>
                <th className="p-2 text-center">CA pondéré (€)</th>
                <th className="p-2">Verrou</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTableRows.map((e) => (
                <tr key={e.id} className="border-t border-black/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                  <td className="p-2 whitespace-nowrap text-center">{e.dayIso}</td>
                  <td className="p-2 whitespace-nowrap text-center">{e.act}</td>
                  <td className="p-2 whitespace-nowrap text-center">{e.company ?? "—"}</td>
                  <td className="p-2 whitespace-nowrap text-center">{e.contractNumber || "—"}</td>
                  <td className="p-2 whitespace-nowrap text-center">{e.effectiveDateIso}</td>
                  <td className="p-2 whitespace-nowrap text-center">{e.clientName}</td>
                  <td className="p-2 whitespace-nowrap text-center">{e.caEur.toLocaleString("fr-FR")} €</td>
                  <td className="p-2 whitespace-nowrap text-center">{e.caPondereEur.toLocaleString("fr-FR")} €</td>
                  <td className="p-2 whitespace-nowrap"><LockSvg open={!isMonthLocked} /></td>
                  <td className="p-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        className="btn text-sm text-white bg-emerald-500 hover:brightness-110"
                        title="Éditer"
                        disabled={isMonthLocked}
                        onClick={() => {
                          setEditingId(e.id);
                          setPendingAct(e.act);
                          setForm({
                            clientName: e.clientName,
                            contractNumber: e.contractNumber,
                            effectiveDateIso: e.effectiveDateIso,
                            caEur: String(e.caEur),
                            company: e.company,
                          });
                        }}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        className="btn text-sm text-white bg-rose-500 hover:brightness-110"
                        title="Supprimer"
                        disabled={isMonthLocked}
                        onClick={() => setEntries((prev) => prev.filter((x) => x.id !== e.id))}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td className="p-3 text-center subtle" colSpan={8}>Aucune saisie pour ce mois.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {pendingAct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card w-full max-w-xl bg-white dark:bg-black">
            <div className="flex items-center justify-between mb-2">
              <h3 className="section-title">{pendingAct}</h3>
              <button className="btn btn-ghost" onClick={() => setPendingAct(null)}>Fermer</button>
            </div>

            <div className="grid gap-3">
              <div className="text-xs text-black/70 dark:text-white/80">Date de saisie (auto): {new Date().toLocaleString()}</div>
              <div className="text-xs text-black/70 dark:text-white/80">Nature de l'acte: {pendingAct}</div>

              <label className="grid gap-1">
                <span className="text-sm">Nom du client</span>
                <input
                  className="input"
                  value={form.clientName}
                  onChange={(e) => setForm((f) => ({ ...f, clientName: normalizeClientNameLive(e.target.value) }))}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Numéro de contrat</span>
                <input className="input" value={form.contractNumber} onChange={(e) => setForm((f) => ({ ...f, contractNumber: e.target.value }))} />
              </label>

              {pendingAct === "Affaire nouvelle" && (
                <label className="grid gap-1">
                  <span className="text-sm">Compagnie</span>
                  <select
                    className="input"
                    value={form.company ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, company: (e.target.value || undefined) as "Allianz" | "Courtage" }))}
                  >
                    <option value="" disabled>Choisir…</option>
                    <option value="Allianz">Allianz</option>
                    <option value="Courtage">Courtage</option>
                  </select>
                </label>
              )}

              <label className="grid gap-1">
                <span className="text-sm">Date d'effet</span>
                <input type="date" className="input" value={form.effectiveDateIso} onChange={(e) => setForm((f) => ({ ...f, effectiveDateIso: e.target.value }))} />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">CA (€ entier)</span>
                <input className="input" type="number" inputMode="numeric" step="1" min="0" value={form.caEur} onChange={(e) => setForm((f) => ({ ...f, caEur: e.target.value }))} />
              </label>

              <div className="text-sm text-black/80 dark:text-white/90">
                CA pondéré (auto): {(() => {
                  const n = Math.max(0, Math.floor(Number(form.caEur)) || 0);
                  return computePondere(n, pendingAct);
                })()} €
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setPendingAct(null)}>Annuler</button>
              <button className="btn btn-primary" disabled={!canSubmit || isMonthLocked} onClick={submitAct}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


