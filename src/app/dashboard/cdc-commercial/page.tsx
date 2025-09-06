"use client";

import { getCurrentSession } from "@/lib/auth";
import { getCdcConfig } from "@/config/cdc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentPlusIcon, Cog6ToothIcon, ClockIcon, ShieldCheckIcon, ArrowPathIcon, PencilIcon, TrashIcon, ChartBarIcon, CurrencyEuroIcon, BoltIcon, AdjustmentsVerticalIcon, InformationCircleIcon, BellAlertIcon, FlagIcon, RocketLaunchIcon, ArrowsUpDownIcon } from "@heroicons/react/24/outline";
import AppModal from "@/app/components/AppModal";
import { kpiHelp } from "@/app/content/kpiHelp";
import KpiCard from "@/app/components/KpiCard";

// Types — kept local for the UI skeleton. Can be moved to shared types later.
type AnProduct =
  | "AUTO/MOTO"
  | "IARD PART DIVERS"
  | "IARD PRO DIVERS"
  | "PJ"
  | "GAV"
  | "SANTE/PREV"
  | "NOP 50EUR"
  | "EPARGNE/RETRAITE"
  | "PU / VL";

type ProcessKind = "M+3" | "Préterme Auto" | "Préterme IRD";

type EntryKind = "AN" | "PROCESS";

type BaseEntry = {
  id: string;
  type: EntryKind;
  clientName: string;
  // ISO string when the entry is saved (non-editable)
  createdAtIso: string;
  // YYYY-MM-DD the entry belongs to (drives month grouping)
  dayIso: string; // equals date de saisie (auto)
  authorEmail: string;
};

type AnEntry = BaseEntry & {
  type: "AN";
  product: AnProduct;
  contractNumber?: string;
  effectiveDateIso: string; // date d'effet
  primeAnnuelle?: number; // integers in euros
  versementLibre?: number; // integers in euros
  commissionEur: number; // integer in euros
};

type ProcessEntry = BaseEntry & {
  type: "PROCESS";
  process: ProcessKind;
};

type Entry = AnEntry | ProcessEntry;

// Commission rules — integers in euros
function computeAnCommission(product: AnProduct, primeAnnuelle?: number, versementLibre?: number): number {
  switch (product) {
    case "AUTO/MOTO":
      return 10;
    case "IARD PART DIVERS":
      return 20;
    case "IARD PRO DIVERS": {
      const prime = Math.max(0, primeAnnuelle ?? 0);
      const tranches = Math.floor(prime / 1000);
      return 20 + 10 * tranches;
    }
    case "PJ":
      return 30;
    case "GAV":
      return 40;
    case "SANTE/PREV":
      return 50;
    case "NOP 50EUR":
      return 10;
    case "EPARGNE/RETRAITE":
      return 50;
    case "PU / VL": {
      const versement = Math.max(0, versementLibre ?? 0);
      return Math.round(versement * 0.01);
    }
    default:
      return 0;
  }
}

// Normalize client name: ensure first word starts with an uppercase letter
function ensureFirstWordCapitalized(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  const spaceIdx = trimmed.indexOf(" ");
  const first = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
  const rest = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx);
  const normalizedFirst = first.charAt(0).toUpperCase() + first.slice(1);
  return normalizedFirst + rest;
}

function toYearMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toDayIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const ALL_AN_PRODUCTS: AnProduct[] = [
  "AUTO/MOTO",
  "IARD PART DIVERS",
  "IARD PRO DIVERS",
  "PJ",
  "GAV",
  "SANTE/PREV",
  "NOP 50EUR",
  "EPARGNE/RETRAITE",
  "PU / VL",
];

const PROCESS_KINDS: ProcessKind[] = ["M+3", "Préterme Auto", "Préterme IRD"];

// Color helpers
function productGradient(p: AnProduct): string {
  switch (p) {
    case "AUTO/MOTO":
      return "bg-gradient-to-r from-sky-500 to-cyan-400";
    case "IARD PART DIVERS":
      return "bg-gradient-to-r from-rose-500 to-pink-500";
    case "IARD PRO DIVERS":
      return "bg-gradient-to-r from-indigo-500 to-purple-500";
    case "PJ":
      return "bg-gradient-to-r from-amber-500 to-orange-500";
    case "GAV":
      return "bg-gradient-to-r from-lime-500 to-emerald-500";
    case "SANTE/PREV":
      return "bg-gradient-to-r from-teal-500 to-emerald-400";
    case "NOP 50EUR":
      return "bg-gradient-to-r from-slate-600 to-slate-400";
    case "EPARGNE/RETRAITE":
      return "bg-gradient-to-r from-violet-600 to-fuchsia-500";
    case "PU / VL":
      return "bg-gradient-to-r from-fuchsia-500 to-pink-500";
    default:
      return "bg-slate-500";
  }
}

function processGradient(k: ProcessKind): string {
  switch (k) {
    case "M+3":
      return "bg-gradient-to-r from-sky-500 to-cyan-400";
    case "Préterme Auto":
      return "bg-gradient-to-r from-amber-500 to-orange-500";
    case "Préterme IRD":
      return "bg-gradient-to-r from-emerald-500 to-teal-500";
    default:
      return "bg-slate-500";
  }
}

// Small lock icons
function LockSvg({ open }: { open: boolean }) {
  const colorClass = open ? "text-emerald-500" : "text-red-500";
  return (
    <svg
      className={"w-5 h-5 " + colorClass}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
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

export default function CdcCommercialPage() {
  const router = useRouter();
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    const session = getCurrentSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setSessionEmail(session.email);
    const norm = session.role
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const isAdmin = norm.includes("administrateur");
    if (!norm.includes("cdc_commercial") && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [router]);

  // Month navigation state
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthKey = useMemo(() => toYearMonthKey(currentMonthDate), [currentMonthDate]);

  const totalDaysInMonth = useMemo(() => {
    const end = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0);
    return end.getDate();
  }, [currentMonthDate]);

  const dayIsosInMonth = useMemo(() => {
    return Array.from({ length: totalDaysInMonth }, (_, i) => {
      return toDayIso(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), i + 1));
    });
  }, [currentMonthDate, totalDaysInMonth]);

  // Month lock flag (admin-managed later). For now, hard-coded false; could be wired later.
  const [isMonthLocked] = useState<boolean>(false);

  // Entries — local state for skeleton
  const [entries, setEntries] = useState<Entry[]>([]);
  // Persist entries by month in localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cdc_entries");
      if (raw) {
        const parsed: Entry[] = JSON.parse(raw);
        setEntries(parsed);
      }
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("cdc_entries", JSON.stringify(entries));
    } catch {
      // ignore
    }
  }, [entries]);

  // Filters
  type PrimaryFilter = "RESET" | "AN" | "PROCESS";
  const [primaryFilter, setPrimaryFilter] = useState<PrimaryFilter>("RESET");
  const [anProductFilter, setAnProductFilter] = useState<AnProduct | "ALL">("ALL");
  const [processKindFilter, setProcessKindFilter] = useState<ProcessKind | "ALL">("ALL");
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);
  const [kpisUseFilters, setKpisUseFilters] = useState<boolean>(false);

  const handleResetFilters = useCallback(() => {
    setPrimaryFilter("RESET");
    setAnProductFilter("ALL");
    setProcessKindFilter("ALL");
    setSelectedDayIso(null);
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (!e.dayIso.startsWith(monthKey)) return false; // month filter
      if (selectedDayIso && e.dayIso !== selectedDayIso) return false; // day filter
      if (primaryFilter === "AN" && e.type !== "AN") return false;
      if (primaryFilter === "PROCESS" && e.type !== "PROCESS") return false;
      if (primaryFilter === "AN" && anProductFilter !== "ALL") {
        const isMatch = e.type === "AN" && e.product === anProductFilter;
        if (!isMatch) return false;
      }
      if (primaryFilter === "PROCESS" && processKindFilter !== "ALL") {
        const isMatch = e.type === "PROCESS" && e.process === processKindFilter;
        if (!isMatch) return false;
      }
      return true;
    });
  }, [entries, monthKey, primaryFilter, anProductFilter, processKindFilter, selectedDayIso]);

  // Timeline counts per day according to filters
  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    dayIsosInMonth.forEach((d) => map.set(d, 0));
    for (const e of entries) {
      if (!e.dayIso.startsWith(monthKey)) continue;
      if (primaryFilter === "AN" && e.type !== "AN") continue;
      if (primaryFilter === "PROCESS" && e.type !== "PROCESS") continue;
      if (primaryFilter === "AN" && anProductFilter !== "ALL" && e.type === "AN" && e.product !== anProductFilter) continue;
      if (primaryFilter === "PROCESS" && processKindFilter !== "ALL" && e.type === "PROCESS" && e.process !== processKindFilter) continue;
      map.set(e.dayIso, (map.get(e.dayIso) || 0) + 1);
    }
    return map;
  }, [entries, dayIsosInMonth, monthKey, primaryFilter, anProductFilter, processKindFilter]);

  // Modal states
  const [showAnModal, setShowAnModal] = useState<boolean>(false);
  const [pendingProcessKind, setPendingProcessKind] = useState<ProcessKind | null>(null);

  // Handlers for month navigation
  const goPrevMonth = useCallback(() => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);
  const goNextMonth = useCallback(() => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  // CRUD helpers
  const upsertEntry = useCallback((newEntry: Entry) => {
    setEntries((prev) => {
      const existsIndex = prev.findIndex((e) => e.id === newEntry.id);
      if (existsIndex >= 0) {
        const clone = prev.slice();
        clone[existsIndex] = newEntry;
        return clone;
      }
      return [newEntry, ...prev];
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Simple id generator
  const generateId = () => Math.random().toString(36).slice(2, 10);

  // AN modal form state
  const [anForm, setAnForm] = useState<{
    product: AnProduct;
    clientName: string;
    contractNumber: string;
    effectiveDateIso: string;
    primeAnnuelle?: number;
    versementLibre?: number;
  }>({
    product: "AUTO/MOTO",
    clientName: "",
    contractNumber: "",
    effectiveDateIso: toDayIso(new Date()),
  });

  const canSubmitAn = useMemo(() => {
    if (!anForm.clientName.trim()) return false;
    if (!anForm.effectiveDateIso) return false;
    if (anForm.product === "PU / VL") {
      return !!anForm.versementLibre && anForm.versementLibre > 0;
    }
    return !!anForm.primeAnnuelle && anForm.primeAnnuelle > 0;
  }, [anForm]);

  const submitAn = () => {
    if (isMonthLocked) return;
    const today = new Date();
    const commission = computeAnCommission(anForm.product, anForm.primeAnnuelle, anForm.versementLibre);
    const entry: AnEntry = {
      id: generateId(),
      type: "AN",
      clientName: ensureFirstWordCapitalized(anForm.clientName),
      createdAtIso: today.toISOString(),
      dayIso: toDayIso(today), // date de saisie auto
      authorEmail: sessionEmail || "unknown",
      product: anForm.product,
      contractNumber: anForm.contractNumber || undefined,
      effectiveDateIso: anForm.effectiveDateIso, // date d'effet choisie
      primeAnnuelle: anForm.product === "PU / VL" ? undefined : anForm.primeAnnuelle,
      versementLibre: anForm.product === "PU / VL" ? anForm.versementLibre : undefined,
      commissionEur: commission,
    };
    upsertEntry(entry);
    setShowAnModal(false);
    setAnForm((f) => ({ ...f, clientName: "", contractNumber: "" }));
  };

  // Process modal form state
  const [processClientName, setProcessClientName] = useState<string>("");

  const submitProcess = () => {
    if (isMonthLocked || !pendingProcessKind) return;
    if (!processClientName.trim()) return;
    const today = new Date();
    const entry: ProcessEntry = {
      id: generateId(),
      type: "PROCESS",
      clientName: ensureFirstWordCapitalized(processClientName),
      createdAtIso: today.toISOString(),
      dayIso: toDayIso(today), // date de saisie auto
      authorEmail: sessionEmail || "unknown",
      process: pendingProcessKind,
    };
    upsertEntry(entry);
    setPendingProcessKind(null);
    setProcessClientName("");
  };

  // Derived table rows
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const tableRows = useMemo(() => {
    const rows = [...filteredEntries];
    rows.sort((a, b) => {
      if (a.dayIso === b.dayIso) return (sortAsc ? 1 : -1) * a.createdAtIso.localeCompare(b.createdAtIso);
      return (sortAsc ? 1 : -1) * a.dayIso.localeCompare(b.dayIso);
    });
    return rows;
  }, [filteredEntries, sortAsc]);

  // KPIs for current month (independent of timeline/table filters)
  const kpis = useMemo(() => {
    // When enabled, KPIs react to primary/product/process filters (but ignore selected day)
    const monthEntries = (kpisUseFilters
      ? entries.filter((e) => {
          if (!e.dayIso.startsWith(monthKey)) return false;
          if (primaryFilter === "AN" && e.type !== "AN") return false;
          if (primaryFilter === "PROCESS" && e.type !== "PROCESS") return false;
          if (primaryFilter === "AN" && anProductFilter !== "ALL") {
            return e.type === "AN" && e.product === anProductFilter;
          }
          if (primaryFilter === "PROCESS" && processKindFilter !== "ALL") {
            return e.type === "PROCESS" && e.process === processKindFilter;
          }
          return true;
        })
      : entries.filter((e) => e.dayIso.startsWith(monthKey)));
    const anEntries = monthEntries.filter((e): e is AnEntry => e.type === "AN");
    const processEntries = monthEntries.filter((e): e is ProcessEntry => e.type === "PROCESS");

    const countAn = anEntries.length;
    const countAuto = anEntries.filter((e) => e.product === "AUTO/MOTO").length;
    const countOthers = countAn - countAuto;
    const countProcessTotal = processEntries.length;
    const countM3 = processEntries.filter((p) => p.process === "M+3").length;
    const countPretAuto = processEntries.filter((p) => p.process === "Préterme Auto").length;
    const countPretIrd = processEntries.filter((p) => p.process === "Préterme IRD").length;

    let ca = 0; // integer euros
    for (const e of anEntries) {
      if (e.product === "PU / VL") ca += e.versementLibre ?? 0;
      else ca += e.primeAnnuelle ?? 0;
    }

    let commissionsPot = 0; // integer euros
    for (const e of anEntries) commissionsPot += e.commissionEur;

    const ratio = countAuto === 0 ? 100 : Math.round((countOthers / countAuto) * 100);
    const commissionsReal = commissionsPot >= 200 && countProcessTotal >= 15 && ratio >= 100 ? commissionsPot : 0;

    const euro = (n: number) => `${n.toLocaleString("fr-FR")} €`;

    return {
      countAn,
      countAuto,
      countOthers,
      countProcessTotal,
      countM3,
      countPretAuto,
      countPretIrd,
      caLabel: euro(ca),
      ratioLabel: `${ratio} %`,
      commissionsPotLabel: euro(commissionsPot),
      commissionsRealLabel: euro(commissionsReal),
    };
  }, [entries, monthKey, kpisUseFilters, primaryFilter, anProductFilter, processKindFilter]);
  const [kpiInfo, setKpiInfo] = useState<{ open: boolean; title: string; body: string }>({ open: false, title: "", body: "" });

  // Motivation metrics for cadence and remaining time
  const motivation = useMemo(() => {
    // Determine elapsed and remaining days relative to current date
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === currentMonthDate.getFullYear() && now.getMonth() === currentMonthDate.getMonth();
    const isPast = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0) < new Date(now.getFullYear(), now.getMonth(), 1);
    const isFuture = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1) > new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const totalDays = totalDaysInMonth;
    const elapsed = isCurrentMonth ? now.getDate() : isPast ? totalDays : 0;
    const remaining = Math.max(0, totalDays - elapsed);

    const monthProcessEntries = entries.filter((e): e is ProcessEntry => e.type === "PROCESS" && e.dayIso.startsWith(monthKey));
    const processTotal = monthProcessEntries.length;

    // Count processes per day for regularity
    const perDay = new Map<number, number>();
    for (const e of monthProcessEntries) {
      const day = Number(e.dayIso.split("-")[2]);
      perDay.set(day, (perDay.get(day) || 0) + 1);
    }
    let daysWithMin2 = 0;
    for (let d = 1; d <= elapsed; d++) {
      if ((perDay.get(d) || 0) >= 2) daysWithMin2++;
    }
    const avgPerDay = elapsed > 0 ? processTotal / elapsed : 0;

    // Configurable targets
    const { processMonthlyTarget: targetMonthly, minDailyCadence } = getCdcConfig();
    const toTarget = Math.max(0, targetMonthly - processTotal);
    const paceNeeded = remaining > 0 ? Math.ceil(toTarget / remaining) : 0;

    return {
      elapsed,
      remaining,
      processTotal,
      avgPerDay,
      daysWithMin2,
      targetMonthly,
      minDailyCadence,
      toTarget,
      paceNeeded,
    };
  }, [entries, monthKey, currentMonthDate, totalDaysInMonth]);

  // Replaced by shared component

  

  return (
    <div className="space-y-4">
      <div className="hero">
        {/* 1) Navigation mois */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title">Activité commerciale</h1>
            <p className="subtle text-sm">Saisie et suivi mensuels</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" onClick={goPrevMonth} title="Mois précédent">◀</button>
            <span className="badge badge-strong" title={monthKey}>{currentMonthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
            <button className="btn btn-ghost" onClick={goNextMonth} title="Mois suivant">▶</button>
          </div>
        </div>

        {/* KPIs sous le mois */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
          <KpiCard title="Affaires nouvelles" value={kpis.countAn} gradient="bg-gradient-to-r from-pink-500 to-fuchsia-500" Icon={DocumentPlusIcon} onInfo={() => setKpiInfo({ open: true, title: "Affaires nouvelles", body: kpiHelp.actes })} />
          <KpiCard title="AUTO/MOTO" value={kpis.countAuto} gradient="bg-gradient-to-r from-sky-500 to-cyan-400" Icon={ChartBarIcon} onInfo={() => setKpiInfo({ open: true, title: "AUTO/MOTO", body: "Nombre d’AN de type AUTO/MOTO pour le mois." })} />
          <KpiCard title="Autres AN" value={kpis.countOthers} gradient="bg-gradient-to-r from-violet-500 to-purple-500" Icon={ChartBarIcon} onInfo={() => setKpiInfo({ open: true, title: "Autres AN", body: "Nombre d’AN dont le type est différent de AUTO/MOTO." })} />
          <KpiCard title="Process (total)" value={kpis.countProcessTotal} sub={`M+3 ${kpis.countM3} • Auto ${kpis.countPretAuto} • IRD ${kpis.countPretIrd}`} gradient="bg-gradient-to-r from-emerald-500 to-teal-500" Icon={BoltIcon} onInfo={() => setKpiInfo({ open: true, title: "Process (total)", body: "Nombre total de saisies Process (M+3, Préterme Auto, Préterme IRD) sur le mois, avec détail par type." })} />
          <KpiCard title="CA cumulé" value={kpis.caLabel} gradient="bg-gradient-to-r from-amber-500 to-orange-500" Icon={CurrencyEuroIcon} onInfo={() => setKpiInfo({ open: true, title: "CA cumulé", body: kpiHelp.caBrut })} />
          <KpiCard title="Ratio" value={kpis.ratioLabel} gradient="bg-gradient-to-r from-indigo-500 to-blue-500" Icon={AdjustmentsVerticalIcon} onInfo={() => setKpiInfo({ open: true, title: "Ratio", body: "(Autres AN) / (AUTO/MOTO) en %. Si AUTO/MOTO = 0, ratio fixé à 100%." })} />
          <KpiCard title="Com. potentielles" value={kpis.commissionsPotLabel} gradient="bg-gradient-to-r from-rose-500 to-red-500" Icon={CurrencyEuroIcon} onInfo={() => setKpiInfo({ open: true, title: "Commissions potentielles", body: "Somme des commissions calculées selon le barème par type d’AN (entiers en €)." })} />
          <KpiCard title="Com. réelles" value={kpis.commissionsRealLabel} gradient="bg-gradient-to-r from-lime-500 to-emerald-500" Icon={CurrencyEuroIcon} onInfo={() => setKpiInfo({ open: true, title: "Commissions réelles", body: "Égales aux commissions potentielles si et seulement si: potentielles ≥ 200 €, process ≥ 15 et ratio ≥ 100 %. Sinon: 0 €." })} />
        </div>

        {/* Motivation / Alerte cadence */}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl p-3 bg-white/15 backdrop-blur-md border border-white/20 flex items-center gap-3">
            <BellAlertIcon className="w-6 h-6 text-amber-400" />
            <div className="text-sm">
              {motivation.remaining > 0 ? (
                <>
                  Il reste <b>{motivation.remaining} jour(s)</b> dans le mois. Objectif process: <b>{motivation.targetMonthly}</b> (manque <b>{motivation.toTarget}</b>).
                </>
              ) : (
                <>Mois terminé. Total process: <b>{motivation.processTotal}</b>.</>
              )}
            </div>
          </div>
          <div className="rounded-xl p-3 bg-white/15 backdrop-blur-md border border-white/20 flex items-center gap-3">
            <RocketLaunchIcon className="w-6 h-6 text-emerald-400" />
            <div className="text-sm">
              Cadence moyenne: <b>{motivation.avgPerDay.toFixed(2)}</b>/jour. À tenir: <b>{Math.max(motivation.minDailyCadence, motivation.paceNeeded)}</b>/jour.
              {motivation.elapsed > 0 && (
                <span className="ml-1">Jours avec ≥ 2 process: <b>{motivation.daysWithMin2}</b> / {motivation.elapsed}</span>
              )}
            </div>
          </div>
        </div>

        {/* (déplacé) boutons de saisie → désormais au-dessus du tableau */}

        <AppModal open={kpiInfo.open} title={kpiInfo.title} onClose={() => setKpiInfo({ open: false, title: "", body: "" })}>
          <p>{kpiInfo.body}</p>
        </AppModal>

        {/* 3) Timeline + système de filtres colorés */}
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`btn px-4 ${primaryFilter === "RESET" ? "text-white bg-gradient-to-r from-slate-600 to-slate-400" : "btn-ghost"}`}
              onClick={handleResetFilters}
            >
              <ArrowPathIcon className="w-4 h-4 mr-1" /> Reset
            </button>
            <button
              className={`btn px-4 ${primaryFilter === "AN" ? "text-white bg-gradient-to-r from-pink-500 to-rose-500" : "btn-ghost"}`}
              onClick={() => { setPrimaryFilter("AN"); setProcessKindFilter("ALL"); }}
            >
              <DocumentPlusIcon className="w-4 h-4 mr-1" /> AN
            </button>
            <button
              className={`btn px-4 ${primaryFilter === "PROCESS" ? "text-white bg-gradient-to-r from-indigo-500 to-purple-500" : "btn-ghost"}`}
              onClick={() => { setPrimaryFilter("PROCESS"); setAnProductFilter("ALL"); }}
            >
              <ShieldCheckIcon className="w-4 h-4 mr-1" /> PROCESS
            </button>

            {primaryFilter === "AN" && (
              <div className="flex flex-wrap gap-1">
                {ALL_AN_PRODUCTS.map((p) => (
                  <button
                    key={p}
                    className={`btn text-white ${anProductFilter === p ? productGradient(p) : "btn-ghost"}`}
                    onClick={() => setAnProductFilter(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {primaryFilter === "PROCESS" && (
              <div className="flex flex-wrap gap-1">
                {PROCESS_KINDS.map((p) => (
                  <button
                    key={p}
                    className={`btn text-white ${processKindFilter === p ? processGradient(p) : "btn-ghost"}`}
                    onClick={() => setProcessKindFilter(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {selectedDayIso && (
              <button className="btn btn-ghost" onClick={() => setSelectedDayIso(null)}>
                <ClockIcon className="w-4 h-4 mr-1" /> Effacer filtre jour
              </button>
            )}
          </div>

          {/* Timeline dots */}
          <div className="relative overflow-x-auto">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${totalDaysInMonth}, minmax(28px,1fr))` }}>
              {dayIsosInMonth.map((dIso, idx) => {
                const dayNum = idx + 1;
                const count = countsByDay.get(dIso) || 0;
                const isToday = dIso === toDayIso(new Date());
                const active = selectedDayIso === dIso;
                const dow = new Date(dIso).getDay(); // 0 Sun, 6 Sat
                const baseColor =
                  dow === 0
                    ? count === 0
                      ? "bg-red-500 text-white"
                      : count < 3
                      ? "bg-red-600 text-white"
                      : "bg-red-700 text-white"
                    : dow === 6
                    ? count === 0
                      ? "bg-orange-500 text-white"
                      : count < 3
                      ? "bg-orange-600 text-white"
                      : "bg-orange-700 text-white"
                    : count === 0
                    ? "bg-emerald-200 text-emerald-900"
                    : count < 3
                    ? "bg-emerald-500 text-white"
                    : "bg-emerald-600 text-white";
                return (
                  <div key={dIso} className="relative flex flex-col items-center">
                    <button
                      className={
                        "h-8 w-full rounded-full text-xs flex items-center justify-center border " +
                        (active ? "ring-2 ring-white scale-105 shadow " : "") + baseColor
                      }
                      title={`${dayNum}/${currentMonthDate.getMonth() + 1}: ${count} saisie(s)`}
                      onClick={() => setSelectedDayIso((prev) => (prev === dIso ? null : dIso))}
                    >
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

      {/* Table */}
    <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="section-title">Saisies du mois</h2>
          <div className="flex items-center gap-3">
            {/* Eligibility badge */}
            <span className={`badge ${kpis.commissionsRealLabel !== "0 €" ? "bg-emerald-500/20" : "bg-amber-500/20"}`} title="Éligibilité commissions">
              <ShieldCheckIcon className="w-4 h-4" />
              {kpis.commissionsRealLabel !== "0 €" ? "Eligible commissions" : "Non eligible"}
            </span>
            <button className="btn btn-ghost text-sm" onClick={() => setSortAsc((v) => !v)} title="Inverser l'ordre (récent ↔ ancien)">
              <ArrowsUpDownIcon className="w-4 h-4 mr-1" /> {sortAsc ? "Ancien → Récent" : "Récent → Ancien"}
            </button>
            <button
              className="btn btn-ghost text-sm"
              onClick={() => {
                // Build CSV for current month rows only
                const header = ["day","type","detail","client","amount","commission"]; 
                const rows = tableRows.map((e) => {
                  const amount = e.type === "AN" ? (e.product === "PU / VL" ? (e.versementLibre ?? 0) : (e.primeAnnuelle ?? 0)) : "";
                  const commission = e.type === "AN" ? e.commissionEur : "";
                  const detail = e.type === "AN" ? `${e.product}${e.contractNumber ? "-"+e.contractNumber: ""}` : e.process;
                  return [e.dayIso, e.type, `${detail}`, e.clientName, amount, commission];
                });
                const csv = [header, ...rows].map(r => r.join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `saisies-${monthKey}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              title="Exporter le mois en CSV"
            >
              Export CSV
            </button>
            <span className="subtle text-sm">{tableRows.length} ligne(s)</span>
          </div>
        </div>
        {/* Boutons de saisie — juste au-dessus du tableau */}
        <div className="mb-3 sticky top-2 z-10 bg-white/60 dark:bg-black/30 backdrop-blur-md p-2 rounded-xl">
          <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2 justify-items-center">
            <button
              className={`btn px-5 py-2 text-sm text-white shadow-lg hover:brightness-110 ${productGradient("PU / VL")} w-full justify-center`}
              onClick={() => setShowAnModal(true)}
              disabled={isMonthLocked}
              title="Saisir une Affaire Nouvelle"
            >
              <DocumentPlusIcon className="w-4 h-4 mr-1" /> AN
            </button>
            {PROCESS_KINDS.map((p) => (
              <button
                key={p}
                className={`btn px-5 py-2 text-sm text-white shadow-lg hover:brightness-110 ${processGradient(p)} w-full justify-center`}
                onClick={() => setPendingProcessKind(p)}
                disabled={isMonthLocked}
                title={`Saisir un process ${p}`}
              >
                <Cog6ToothIcon className="w-4 h-4 mr-1" /> {p}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white/80 dark:bg-black/40 backdrop-blur-md">
              <tr>
                <th className="p-2 text-center">Jour</th>
                <th className="p-2 text-center">Type</th>
                <th className="p-2 text-center">Détail</th>
                <th className="p-2 text-center">N° contrat</th>
                <th className="p-2 text-center">Date d'effet</th>
                <th className="p-2 text-center">Client</th>
                <th className="p-2 text-center">Montant</th>
                <th className="p-2 text-center">Commission</th>
                <th className="p-2 text-center">Actions</th>
                <th className="p-2 text-center">Verrou</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((e) => (
                <tr key={e.id} className="border-t border-black/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                  <td className="p-2 whitespace-nowrap">{e.dayIso}</td>
                  <td className="p-2 whitespace-nowrap">{e.type === "AN" ? "AN" : e.process}</td>
                  <td className="p-2 whitespace-nowrap">
                    {e.type === "AN" ? (
                      <span>{e.product}</span>
                    ) : (
                      <span>Process</span>
                    )}
                  </td>
                  <td className="p-2 whitespace-nowrap">{e.type === "AN" ? (e.contractNumber || "—") : "—"}</td>
                  <td className="p-2 whitespace-nowrap">{e.type === "AN" ? e.effectiveDateIso : "—"}</td>
                  <td className="p-2 whitespace-nowrap">{e.clientName}</td>
                  <td className="p-2 whitespace-nowrap">
                    {e.type === "AN"
                      ? (e.product === "PU / VL" ? (e.versementLibre ?? 0) : (e.primeAnnuelle ?? 0)) + " €"
                      : "—"}
                  </td>
                  <td className="p-2 whitespace-nowrap">{e.type === "AN" ? `${e.commissionEur} €` : "—"}</td>
                  <td className="p-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button className="btn text-sm text-white bg-emerald-500 hover:brightness-110" title="Éditer" disabled={isMonthLocked}>
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        className="btn text-sm text-white bg-rose-500 hover:brightness-110"
                        title="Supprimer"
                        disabled={isMonthLocked}
                        onClick={() => !isMonthLocked && deleteEntry(e.id)}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-2 whitespace-nowrap text-center"><LockSvg open={!isMonthLocked} /></td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td className="p-3 text-center subtle" colSpan={8}>Aucune saisie pour les filtres actuels.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {tableRows.length === 0 && (
          <div className="p-6 text-center subtle">Aucune saisie pour les filtres actuels.</div>
        )}
      </div>

      {/* AN Modal */}
      {showAnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55">
          <div className="modal-card w-full max-w-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="modal-title">Affaire nouvelle</h3>
              <button className="btn btn-ghost" onClick={() => setShowAnModal(false)}>Fermer</button>
            </div>

            <div className="grid gap-3">
              <div className="text-xs subtle">Date de saisie (auto): {new Date().toLocaleString()}</div>

              <label className="grid gap-1">
                <span className="text-sm">Type d'affaire</span>
                <select
                  className="input"
                  value={anForm.product}
                  onChange={(e) => setAnForm((f) => ({ ...f, product: e.target.value as AnProduct }))}
                >
                  {ALL_AN_PRODUCTS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Nom du client</span>
                <input className="input" value={anForm.clientName} onChange={(e) => setAnForm((f) => ({ ...f, clientName: e.target.value }))} onBlur={(e) => setAnForm((f) => ({ ...f, clientName: ensureFirstWordCapitalized(e.target.value) }))} />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Numéro de contrat (optionnel)</span>
                <input className="input" value={anForm.contractNumber} onChange={(e) => setAnForm((f) => ({ ...f, contractNumber: e.target.value }))} />
              </label>

              <label className="grid gap-1">
                <span className="text-sm">Date d'effet</span>
                <input type="date" className="input" value={anForm.effectiveDateIso} onChange={(e) => setAnForm((f) => ({ ...f, effectiveDateIso: e.target.value }))} />
              </label>

              {anForm.product === "PU / VL" ? (
                <label className="grid gap-1">
                  <span className="text-sm">Versement libre (€ entier)</span>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="0"
                    value={anForm.versementLibre ?? ""}
                    onChange={(e) => setAnForm((f) => ({ ...f, versementLibre: e.target.value === "" ? undefined : Number(e.target.value) }))}
                  />
                </label>
              ) : (
                <label className="grid gap-1">
                  <span className="text-sm">Prime annuelle (€ entier)</span>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="0"
                    value={anForm.primeAnnuelle ?? ""}
                    onChange={(e) => setAnForm((f) => ({ ...f, primeAnnuelle: e.target.value === "" ? undefined : Number(e.target.value) }))}
                  />
                </label>
              )}

              <div className="text-sm">
                Commission potentielle: {computeAnCommission(anForm.product, anForm.primeAnnuelle, anForm.versementLibre)} €
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowAnModal(false)}>Annuler</button>
              <button className="btn btn-primary" disabled={!canSubmitAn || isMonthLocked} onClick={submitAn}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Process Modal */}
      {pendingProcessKind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55">
          <div className="modal-card w-full max-w-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="modal-title">{pendingProcessKind}</h3>
              <button className="btn btn-ghost" onClick={() => setPendingProcessKind(null)}>Fermer</button>
            </div>

            <div className="grid gap-3">
              <div className="text-xs subtle">Date de saisie (auto): {new Date().toLocaleString()}</div>

              <label className="grid gap-1">
                <span className="text-sm">Nom du client</span>
                <input className="input" value={processClientName} onChange={(e) => setProcessClientName(e.target.value)} onBlur={(e) => setProcessClientName(ensureFirstWordCapitalized(e.target.value))} />
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setPendingProcessKind(null)}>Annuler</button>
              <button className="btn btn-primary" disabled={!processClientName.trim() || isMonthLocked} onClick={submitProcess}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


