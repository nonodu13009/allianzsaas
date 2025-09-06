"use client";

import { useMemo, useState } from "react";
import type { MonthData, YearData } from "../types";
import MonthModal from "./MonthModal";

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export default function MonthGrid({
  year,
  yearData,
  onSaveMonth,
}: {
  year: number;
  yearData: YearData | null;
  onSaveMonth: (monthData: MonthData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<MonthData | null>(null);
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {months.map((m) => {
        const md = yearData?.months[m];
        const hasAny = md && (
          (md.commissions.iard || 0) + (md.commissions.vie || 0) + (md.commissions.courtage || 0) + (md.commissions.profitsExceptionnels || 0) + (md.charges || 0) +
          Object.values(md.prelevements || {}).reduce((a,b)=>a+(b||0),0)
        ) > 0;
        const completed = hasAny && (md?.completed ?? false);
        const statusClass = completed ? "tile tile-completed" : "tile tile-pending";
        return (
          <div key={m} className={`${statusClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="tile-heading">{MONTH_LABELS[m - 1]}</div>
                <div className="tile-sub">{year}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${completed ? "badge-success" : "badge-info"}`}>{completed ? "Complété" : "À compléter"}</span>
                <button
                  className="btn btn-sm btn-on-tile"
                  onClick={() => {
                    const next: MonthData =
                      md ?? {
                        month: m,
                        commissions: { iard: 0, vie: 0, courtage: 0, profitsExceptionnels: 0 },
                        charges: 0,
                        prelevements: { Julien: 0, "Jean-Michel": 0 },
                        completed: false,
                      };
                    setCurrent(next);
                    setOpen(true);
                  }}
                >
                  Saisir
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {current && (
        <MonthModal
          open={open}
          initial={current}
          onClose={() => setOpen(false)}
          onSave={(data) => onSaveMonth(data)}
        />
      )}
    </div>
  );
}


