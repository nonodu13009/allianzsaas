"use client";

import type { MonthData, YearData } from "./types";

const STORAGE_PREFIX = "agence_commissions:";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadYear(year: number): YearData {
  if (typeof window === "undefined") return { year, months: {} };
  const key = STORAGE_PREFIX + String(year);
  const parsed = safeParse<YearData>(localStorage.getItem(key));
  if (parsed && parsed.year === year) return parsed;
  return { year, months: {} };
}

export function saveMonth(year: number, monthData: MonthData): void {
  if (typeof window === "undefined") return;
  const key = STORAGE_PREFIX + String(year);
  const current = loadYear(year);
  const month = Math.max(1, Math.min(12, monthData.month));
  const normalized: MonthData = {
    ...monthData,
    month,
    commissions: {
      iard: Math.max(0, Number(monthData.commissions.iard || 0)),
      vie: Math.max(0, Number(monthData.commissions.vie || 0)),
      courtage: Math.max(0, Number(monthData.commissions.courtage || 0)),
      profitsExceptionnels: Math.max(0, Number(monthData.commissions.profitsExceptionnels || 0)),
    },
    charges: Math.max(0, Number(monthData.charges || 0)),
    prelevements: Object.fromEntries(
      Object.entries(monthData.prelevements || {}).map(([k, v]) => [k, Math.max(0, Number(v || 0))])
    ),
    completed: Boolean(monthData.completed),
  };
  const next: YearData = {
    year,
    months: {
      ...current.months,
      [month]: normalized,
    },
  };
  localStorage.setItem(key, JSON.stringify(next));
}

export function exportYearToJSON(year: number): string {
  return JSON.stringify(loadYear(year), null, 2);
}

export function exportYearToCSV(year: number): string {
  const data = loadYear(year);
  const headers = [
    "annee",
    "mois",
    "iard",
    "vie",
    "courtage",
    "profits_exceptionnels",
    "charges",
    "prelevements_total",
    "completed",
  ];
  const rows: string[] = [headers.join(",")];
  for (let m = 1; m <= 12; m++) {
    const md = data.months[m];
    if (!md) continue;
    const prelevementsTotal = Object.values(md.prelevements || {}).reduce((a, b) => a + (b || 0), 0);
    rows.push(
      [
        year,
        m,
        md.commissions.iard || 0,
        md.commissions.vie || 0,
        md.commissions.courtage || 0,
        md.commissions.profitsExceptionnels || 0,
        md.charges || 0,
        prelevementsTotal,
        md.completed ? 1 : 0,
      ].join(",")
    );
  }
  return rows.join("\n");
}


