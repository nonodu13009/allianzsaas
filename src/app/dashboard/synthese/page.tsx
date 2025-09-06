"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentSession } from "@/lib/auth";

export default function SynthesePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [locks, setLocks] = useState<{ [k: string]: boolean }>({});
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const monthKey = useMemo(() => `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, "0")}`, [currentMonthDate]);

  useEffect(() => {
    const s = getCurrentSession();
    if (s) {
      const norm = s.role.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      setIsAdmin(norm.includes("administrateur"));
    }
    try { const raw = localStorage.getItem("locks"); if (raw) setLocks(JSON.parse(raw)); } catch {}
  }, []);

  const [agg, setAgg] = useState<any>(null);

  function sCollRate(totalPondere: number) { if (totalPondere >= 18001) return 0.06; if (totalPondere >= 14001) return 0.04; if (totalPondere >= 10001) return 0.03; if (totalPondere >= 6001) return 0.02; return 0; }
  function sIndRate(totalPondere: number) { if (totalPondere < 10000) return 0.0; if (totalPondere < 14000) return 0.02; if (totalPondere < 18000) return 0.03; if (totalPondere < 22000) return 0.04; return 0.06; }

  useEffect(() => {
    try {
      const rawComm = localStorage.getItem("cdc_entries");
      const comm = rawComm ? JSON.parse(rawComm) : [];
      const cm = comm.filter((e: any) => e.dayIso?.startsWith(monthKey));
      const commByUser: Record<string, any> = {};
      let commTotals = { an: 0, process: 0, ca: 0, commission: 0 };
      for (const e of cm) {
        const u = e.authorEmail || "?";
        commByUser[u] ||= { an: 0, process: 0, ca: 0, commission: 0 };
        if (e.type === "AN") {
          commByUser[u].an++; commTotals.an++;
          const ca = e.product === "PU / VL" ? (e.versementLibre || 0) : (e.primeAnnuelle || 0);
          commByUser[u].ca += ca; commTotals.ca += ca;
          commByUser[u].commission += e.commissionEur || 0; commTotals.commission += e.commissionEur || 0;
        } else { commByUser[u].process++; commTotals.process++; }
      }

      const rawInd = localStorage.getItem("cdc_sante_entries");
      const ind = rawInd ? JSON.parse(rawInd) : [];
      const im = ind.filter((e: any) => e.dayIso?.startsWith(monthKey));
      const indTotals = { brut: 0, pondere: 0, commission: 0 };
      const indByUser: Record<string, any> = {};
      for (const e of im) {
        indTotals.brut += e.caEur || 0; indTotals.pondere += e.caPondereEur || 0;
        const u = e.authorEmail || "?";
        if (u !== "?") {
          indByUser[u] ||= { brut: 0, pondere: 0 };
          indByUser[u].brut += e.caEur || 0;
          indByUser[u].pondere += e.caPondereEur || 0;
        }
      }
      indTotals.commission = Math.round(indTotals.pondere * sIndRate(indTotals.pondere));

      const rawColl = localStorage.getItem("cdc_sante_coll_entries");
      const coll = rawColl ? JSON.parse(rawColl) : [];
      const clm = coll.filter((e: any) => e.dayIso?.startsWith(monthKey));
      const collTotals = { brut: 0, pondere: 0, commission: 0 };
      const collByUser: Record<string, any> = {};
      for (const e of clm) {
        const u = e.authorEmail || "?";
        collByUser[u] ||= { brut: 0, pondere: 0 };
        collByUser[u].brut += e.primeBrute || 0;
        collByUser[u].pondere += e.primePonderee || 0;
        collTotals.brut += e.primeBrute || 0;
        collTotals.pondere += e.primePonderee || 0;
      }
      collTotals.commission = Math.round(collTotals.pondere * sCollRate(collTotals.pondere));
      const totalCommission = commTotals.commission + indTotals.commission + collTotals.commission;
      // calcul commission estimée par CDC (SI et SC) pour affichage détaillé
      const indByUserWithCom: Record<string, any> = {};
      for (const k of Object.keys(indByUser)) {
        const v = indByUser[k];
        indByUserWithCom[k] = { ...v, commission: Math.round(v.pondere * sIndRate(v.pondere)) };
      }

      setAgg({ commTotals, commByUser, indTotals, indByUser: indByUserWithCom, collTotals, collByUser, totalCommission });
    } catch {}
  }, [monthKey]);

  if (!isAdmin) {
    return <div className="card"><h2 className="section-title">Accès restreint</h2><p className="subtle">Cette page est réservée aux administrateurs.</p></div>;
  }

  if (!agg) return <div className="card">Chargement…</div>;

  const euro = (n: unknown) => `${Number(n ?? 0).toLocaleString("fr-FR")} €`;
  const getLock = (roleKey: string) => !!locks[`lock:${roleKey}:${monthKey}`];
  const toggleLock = (roleKey: string) => {
    const key = `lock:${roleKey}:${monthKey}`;
    const next = { ...locks, [key]: !locks[key] };
    setLocks(next);
    try { localStorage.setItem("locks", JSON.stringify(next)); } catch {}
  };

  // (plus de filtres)

  return (
    <div className="space-y-4">
      <div className="hero">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="section-title">Synthèse commerciale</h1>
            <p className="subtle text-sm">Vue admin</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" onClick={() => setCurrentMonthDate(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))}>◀</button>
            <span className="badge badge-strong" title={monthKey}>{currentMonthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
            <button className="btn btn-ghost" onClick={() => setCurrentMonthDate(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))}>▶</button>
            <button className="btn btn-ghost" title="Revenir au mois en cours" onClick={() => {
              const d = new Date();
              setCurrentMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
            }}>Mois courant</button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="section-title mb-1">Commercial</h2>
          <span className="text-xs opacity-80">Tous les CDC</span>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span>AN: <b>{agg.commTotals.an}</b></span>
          <span>Process: <b>{agg.commTotals.process}</b></span>
          <span>CA: <b>{euro(agg.commTotals.ca)}</b></span>
          <span>Commissions à verser: <b>{euro(agg.commTotals.payable)}</b></span>
          <button className={`btn ${getLock('cdc_commercial') ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`} onClick={() => toggleLock('cdc_commercial')}>{getLock('cdc_commercial') ? 'Déverrouiller' : 'Verrouiller'}</button>
        </div>
        <div className="mt-2 text-xs">
          {Object.entries(agg.commByUser).map(([u, v]: any) => (
            <div key={u} className="flex flex-wrap gap-3 opacity-90 border-t border-black/10 pt-1">
              <span className="font-medium">{u}</span>
              <span>AN: <b>{v.an}</b></span>
              <span>Process: <b>{v.process}</b></span>
              <span>CA: <b>{euro(v.ca)}</b></span>
              <span>Com (à verser): <b>{euro(v.payable || 0)}</b></span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="section-title mb-1">Santé individuelle</h2>
          <span className="text-xs opacity-80">Tous les CDC</span>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span>CA brut: <b>{euro(agg.indTotals.brut)}</b></span>
          <span>CA pondéré: <b>{euro(agg.indTotals.pondere)}</b></span>
          <span>Commissions à verser: <b>{euro(agg.indTotals.payable)}</b></span>
          <button className={`btn ${getLock('cdc_sante_ind') ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`} onClick={() => toggleLock('cdc_sante_ind')}>{getLock('cdc_sante_ind') ? 'Déverrouiller' : 'Verrouiller'}</button>
        </div>
        <div className="mt-2 text-xs">
          {Object.entries(agg.indByUser || {}).map(([u, v]: any) => (
            <div key={u} className="flex flex-wrap gap-3 opacity-90 border-t border-black/10 pt-1">
              <span className="font-medium">{u}</span>
              <span>Brut: <b>{euro(v.brut)}</b></span>
              <span>Pondéré: <b>{euro(v.pondere)}</b></span>
              <span>Com (à verser): <b>{euro(v.payable || 0)}</b></span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="section-title mb-1">Santé collective</h2>
          <span className="text-xs opacity-80">Tous les CDC</span>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span>Prime brute: <b>{euro(agg.collTotals.brut)}</b></span>
          <span>Prime pondérée: <b>{euro(agg.collTotals.pondere)}</b></span>
          <span>Commissions à verser: <b>{euro(agg.collTotals.payable)}</b></span>
          <button className={`btn ${getLock('cdc_sante_coll') ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`} onClick={() => toggleLock('cdc_sante_coll')}>{getLock('cdc_sante_coll') ? 'Déverrouiller' : 'Verrouiller'}</button>
        </div>
        <div className="mt-2 text-xs">
          {Object.entries(agg.collByUser).map(([u, v]: any) => (
            <div key={u} className="flex flex-wrap gap-3 opacity-90 border-t border-black/10 pt-1">
              <span className="font-medium">{u}</span>
              <span>Brut: <b>{euro(v.brut)}</b></span>
              <span>Pondéré: <b>{euro(v.pondere)}</b></span>
              <span>Com (à verser): <b>{euro(v.commission)}</b></span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title mb-1">Total agence</h2>
        <div>Commissions à verser (tous rôles): <b>{euro(agg.totalCommissionPayable)}</b></div>
      </div>
    </div>
  );
}


