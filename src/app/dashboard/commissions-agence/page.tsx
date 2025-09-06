"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentSession } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CommissionBreakdown,
  type MonthData,
  type YearData,
} from "./types";
import { loadYear, saveMonth, exportYearToCSV, exportYearToJSON } from "./dataService";
import YearNavigator from "./components/YearNavigator";
import MonthGrid from "./components/MonthGrid";
import KpiSummary from "./components/KpiSummary";
import YearTable from "./components/YearTable";

export default function CommissionsAgencePage() {
  const router = useRouter();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [yearData, setYearData] = useState<YearData | null>(null);
  const [canImport, setCanImport] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);

  useEffect(() => {
    const session = getCurrentSession();
    const isAdmin = !!session && session.role.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "administrateur";
    if (!isAdmin) router.replace("/dashboard");
    setYearData(loadYear(year));
    if (typeof window !== "undefined") {
      const done = localStorage.getItem("commissions_import_done");
      setCanImport(!done);
    }
  }, [year, router]);

  const onChangeYear = (next: number) => {
    setYear(next);
  };

  const handleSaveMonth = (monthData: MonthData) => {
    saveMonth(year, monthData);
    setYearData(loadYear(year));
  };

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onExportJSON = () => {
    const content = exportYearToJSON(year);
    download(content, `agence_commissions_${year}.json`, "application/json");
  };

  const onExportCSV = () => {
    const content = exportYearToCSV(year);
    download(content, `agence_commissions_${year}.csv`, "text/csv");
  };

  const hasAnyStoredData = (): boolean => {
    try {
      if (typeof window === "undefined") return false;
      const start = 2022;
      const end = new Date().getFullYear();
      for (let y = start; y <= end; y++) {
        const d = loadYear(y);
        if (d && d.months && Object.keys(d.months).length > 0) return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const importFromDocs = async () => {
    try {
      if (importing) return;
      setImporting(true);
      const res = await fetch("/api/commissions/import", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (!json?.ok) return;
      const all: Array<{ year: number; months: any[] }> = json.data;
      // Keep only 2022-2025, and up to July 2025
      for (const y of all) {
        if (y.year < 2022 || y.year > 2025) continue;
        const limit = y.year === 2025 ? 7 : 12;
        for (const m of y.months.slice(0, limit)) {
          saveMonth(y.year, { ...m, completed: true });
        }
      }
      setYearData(loadYear(year));
      if (typeof window !== "undefined") {
        localStorage.setItem("commissions_import_done", "1");
        setCanImport(false);
      }
    } catch {}
    finally { setImporting(false); }
  };

  // Auto-import at first access when not yet imported
  useEffect(() => {
    if (canImport) {
      importFromDocs();
    }
  }, [canImport]);

  // Check import flag AND actual presence of data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const done = localStorage.getItem("commissions_import_done");
      const hasData = hasAnyStoredData();
      setCanImport(!(done && hasData));
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Commissions agence</h1>
        <div className="flex items-center gap-2">
          {canImport && (
            <button className="btn btn-sm" onClick={importFromDocs}>Importer docs</button>
          )}
          <button className="btn btn-sm" onClick={onExportCSV}>Exporter CSV</button>
          <button className="btn btn-sm" onClick={onExportJSON}>Exporter JSON</button>
          <Link href="/dashboard" className="btn btn-ghost text-sm">Retour</Link>
        </div>
      </div>
      <KpiSummary yearData={yearData} />
      <YearNavigator year={year} onChangeYear={onChangeYear} />
      <MonthGrid year={year} yearData={yearData} onSaveMonth={handleSaveMonth} />
      <YearTable yearData={yearData} />
    </div>
  );
}


