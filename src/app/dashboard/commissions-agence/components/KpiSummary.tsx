"use client";

import KpiCard from "@/app/components/KpiCard";
import type { YearData } from "../types";

export default function KpiSummary({ yearData }: { yearData: YearData | null }) {
  const months = yearData ? Object.values(yearData.months) : [];
  const totalCommissions = months.reduce((acc, m) => acc + (m.commissions.iard + m.commissions.vie + m.commissions.courtage + m.commissions.profitsExceptionnels), 0);
  const totalCharges = months.reduce((acc, m) => acc + m.charges, 0);
  const result = totalCommissions - totalCharges;

  const euro = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <KpiCard title="Total Commissions" value={euro(totalCommissions)} gradient="grad-sky" />
      <KpiCard title="Total Charges" value={euro(totalCharges)} gradient="grad-amber" />
      <KpiCard title="Résultat" value={euro(result)} gradient={result >= 0 ? "grad-emerald" : "grad-red"} />
    </div>
  );
}


