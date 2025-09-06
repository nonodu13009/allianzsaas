"use client";

import { useEffect, useState } from "react";

export default function YearNavigator({
  year,
  onChangeYear,
}: {
  year: number;
  onChangeYear: (year: number) => void;
}) {
  const current = new Date().getFullYear();
  const minYear = 2022;
  const isCurrent = year === current;
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (isCurrent) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [isCurrent]);
  return (
    <div className="flex items-center gap-4">
      <div className="segmented">
        <button className="icon-btn" onClick={() => onChangeYear(Math.max(minYear, year - 1))} aria-label="Année précédente" disabled={year <= minYear}>◀︎</button>
        <button className={`chip ${year === year - 1 ? "chip-active" : ""} ${year - 1 < minYear ? "chip-disabled" : ""}`} onClick={() => onChangeYear(Math.max(minYear, year - 1))} disabled={year - 1 < minYear}>{year - 1}</button>
        <button className={`chip chip-active`} onClick={() => onChangeYear(year)}>{year}</button>
        <button className={`chip`} onClick={() => onChangeYear(year + 1)}>{year + 1}</button>
        <button className="icon-btn" onClick={() => onChangeYear(year + 1)} aria-label="Année suivante">▶︎</button>
      </div>
      <button
        className={`chip ${isCurrent ? "chip-active" : ""} relative ${flash ? "ring-4 ring-emerald-400/60" : ""}`}
        onClick={() => {
          if (!isCurrent) onChangeYear(current);
          setFlash(true);
          setTimeout(() => setFlash(false), 600);
        }}
        aria-label="Revenir à l'année en cours"
      >
        Année en cours ({current}){isCurrent ? " ✓" : ""}
      </button>
    </div>
  );
}


