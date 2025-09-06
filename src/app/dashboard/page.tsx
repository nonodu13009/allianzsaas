"use client";

import { getCurrentSession } from "@/lib/auth";
import { getRoleDisplayName } from "@/data/users";
import { useEffect, useMemo, useState } from "react";

export default function DashboardPage() {
  const [welcome, setWelcome] = useState<string>("");
  const [today] = useState<Date>(() => new Date());
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  function toMonthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  const monthKey = useMemo(() => toMonthKey(today), [today]);

  const monthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const monthEnd = useMemo(() => new Date(today.getFullYear(), today.getMonth() + 1, 0), [today]);
  const totalDays = monthEnd.getDate();
  const dayOfMonth = today.getDate();
  const progress = totalDays > 1 ? (dayOfMonth - 1) / (totalDays - 1) : 0;
  const percent = Math.max(0, Math.min(100, progress * 100));
  const centerPercent = Math.max(0, Math.min(100, ((dayOfMonth - 0.5) / totalDays) * 100));

  const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => i + 1), [totalDays]);
  const dayColorClass = (d: number) => {
    const dow = new Date(today.getFullYear(), today.getMonth(), d).getDay(); // 0: Dimanche, 6: Samedi
    if (dow === 0) return "bg-red-400";
    if (dow === 6) return "bg-orange-400";
    return "bg-emerald-400";
  };

  useEffect(() => {
    const session = getCurrentSession();
    if (session) {
      const roleLabel = getRoleDisplayName(session.role);
      setWelcome(`Bienvenue, ${session.firstName} ${session.lastName} — ${roleLabel}`);
      const normalized = session.role
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      setIsAdmin(normalized.includes("administrateur"));
    }
  }, []);

  // (suppression de la synthèse admin sur l'accueil)

  return (
    <div>
      <div className="hero">
        <h1 className="relative heading-hero">Tableau de bord</h1>
        <p className="relative mt-2 subtle">{welcome || "Bienvenue"}</p>

        <div className="relative mt-6">
          <div className="flex justify-between text-xs opacity-90">
            <span>
              {monthStart.toLocaleDateString(undefined, { month: "long" })}
            </span>
            <span>{totalDays} jours</span>
          </div>
          <div className="relative mt-2">
            <div className="h-1.5 w-full rounded-full bg-white/90" />
            <div
              className="absolute -top-2.5 h-3 w-6 rounded-full bg-sky-400 border-2 border-white shadow"
              style={{ left: `calc(${centerPercent}% - 12px)` }}
              title="Position du jour"
            />
          </div>
          <div className="mt-1 text-xs opacity-90">
            Aujourd’hui: {today.toLocaleDateString()}
          </div>
        </div>

        <div className="mt-4">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(0, 1fr))` }}
          >
            {days.map((d) => (
              <div key={d} className="flex items-center justify-center">
                <div
                  className={
                    `flex items-center justify-center rounded-full text-[11px] sm:text-xs text-white ` +
                    `h-7 w-7 sm:h-8 sm:w-8 ` +
                    dayColorClass(d) +
                    (d === dayOfMonth ? " ring-2 ring-white shadow-lg scale-110" : " opacity-95")
                  }
                  title={new Date(today.getFullYear(), today.getMonth(), d).toLocaleDateString()}
                >
                  {d}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="card">
          <h2 className="section-title mb-1">État</h2>
          <p className="subtle text-sm">Zone commune à tous les rôles.</p>
        </div>
        
      </section>
    </div>
  );
}


