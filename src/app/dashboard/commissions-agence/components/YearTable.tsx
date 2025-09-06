"use client";

import type { YearData } from "../types";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function eur(n: number): string {
  return (n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function YearTable({ yearData }: { yearData: YearData | null }) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const get = (m: number) => yearData?.months[m];
  const totalRow = (vals: number[]) => vals.reduce((a, b) => a + (b || 0), 0);

  const row = (label: string, extractor: (m: number) => number) => (
    <tr>
      <th className="text-left sticky left-0 bg-white/40 dark:bg-black/30 backdrop-blur-sm font-medium">{label}</th>
      {months.map((m) => (
        <td key={m} className="text-right tabular-nums">{eur(extractor(m))}</td>
      ))}
      <td className="text-right font-semibold tabular-nums">{eur(totalRow(months.map(extractor)))}</td>
    </tr>
  );

  return (
    <div className="overflow-x-auto panel">
      <table className="min-w-[920px] w-full text-sm table-sleek">
        <thead>
          <tr>
            <th className="text-left sticky left-0 bg-white/60 dark:bg-black/40 backdrop-blur-sm">Poste</th>
            {months.map((m) => (
              <th key={m} className="text-right font-medium">{MONTHS[m - 1]}</th>
            ))}
            <th className="text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="row-commission">{row("IARD", (m) => get(m)?.commissions.iard || 0).props.children}</tr>
          <tr className="row-commission">{row("Vie", (m) => get(m)?.commissions.vie || 0).props.children}</tr>
          <tr className="row-commission">{row("Courtage", (m) => get(m)?.commissions.courtage || 0).props.children}</tr>
          <tr className="row-commission">{row("Profits", (m) => get(m)?.commissions.profitsExceptionnels || 0).props.children}</tr>
          <tr className="row-total">{row("Total commissions", (m) => {
            const md = get(m); if (!md) return 0; const c = md.commissions; return (c.iard||0)+(c.vie||0)+(c.courtage||0)+(c.profitsExceptionnels||0);
          }).props.children}</tr>
          <tr className="row-charges">{row("Charges", (m) => get(m)?.charges || 0).props.children}</tr>
          <tr className="row-result">{row("Résultat", (m) => {
            const md = get(m); if (!md) return 0; const c = md.commissions; return (c.iard||0)+(c.vie||0)+(c.courtage||0)+(c.profitsExceptionnels||0) - (md.charges||0);
          }).props.children}</tr>
          <tr className="row-prelevements">{row("Prélèvements", (m) => {
            const md = get(m); if (!md) return 0; return Object.values(md.prelevements||{}).reduce((a,b)=>a+(b||0),0);
          }).props.children}</tr>
        </tbody>
      </table>
    </div>
  );
}


