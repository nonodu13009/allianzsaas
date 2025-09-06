"use client";

import { useEffect, useMemo, useState } from "react";
import AppModal from "@/app/components/AppModal";
import { getCurrentSession } from "@/lib/auth";
import { users } from "@/data/users";

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
  const [detail, setDetail] = useState<{ role: 'comm'|'ind'|'coll'; email: string; open: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

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
      // calcul commission estimée par CDC (SI et SC) pour affichage détaillé + totaux payables
      const indByUserWithCom: Record<string, any> = {};
      for (const k of Object.keys(indByUser)) {
        const v = indByUser[k];
        const c = Math.round(v.pondere * sIndRate(v.pondere));
        indByUserWithCom[k] = { ...v, commission: c, payable: c };
      }
      // commission par CDC pour SC
      for (const k of Object.keys(collByUser)) {
        const v = collByUser[k];
        v.commission = Math.round(v.pondere * sCollRate(v.pondere));
      }
      const totalCommissionPayable = commTotals.commission + indTotals.commission + collTotals.commission;
      // aligner champs 'payable' utilisés par l'UI
      const commTotalsOut: any = { ...commTotals, payable: commTotals.commission };
      const indTotalsOut: any = { ...indTotals, payable: indTotals.commission };
      const collTotalsOut: any = { ...collTotals, payable: collTotals.commission };

      setAgg({ commTotals: commTotalsOut, commByUser, indTotals: indTotalsOut, indByUser: indByUserWithCom, collTotals: collTotalsOut, collByUser, totalCommissionPayable });
    } catch {}
  }, [monthKey, refresh]);

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
            <button disabled={busy} className="btn btn-ghost" title="Générer 10 entrées mock par CDC et par rôle pour ce mois" onClick={() => {
              setBusy(true);
              try {
                const rnd = (min:number,max:number)=> Math.round(min + Math.random()*(max-min));
                const iso = (d:Date)=> d.toISOString().slice(0,10);
                const begin = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1);
                const emailsBy = (predicate:(u:any)=>boolean)=> users.filter(predicate).map(u=>u.email);
                const norm = (r:string)=> r.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'_');
                const randomName = (prefix:string)=> `${prefix} ${Math.random().toString(36).slice(2,6)}`;
                const randomContract = (prefix:string)=> `${prefix}-${String(rnd(100000,999999))}`;

                // Commercial
                const commEmails = emailsBy(u=> norm(u.role).includes('cdc_commercial'));
                const commRaw = JSON.parse(localStorage.getItem('cdc_entries')||'[]');
                for (const email of commEmails) {
                  for (let i=0;i<10;i++) {
                    const day = new Date(begin.getFullYear(), begin.getMonth(), rnd(1,28));
                    const isAN = Math.random() < 0.6;
                    const entry:any = {
                      id: Math.random().toString(36).slice(2,10),
                      authorEmail: email,
                      dayIso: iso(day),
                      createdAtIso: new Date(day.getTime()+rnd(0, 86400000)).toISOString(),
                      clientName: randomName('Client'),
                      mock: true,
                    };
                    if (isAN) {
                      entry.type = 'AN';
                      const products = ['AUTO/MOTO','IARD PART DIVERS','IARD PRO DIVERS','PJ','GAV','SANTE/PREV','NOP 50EUR','EPARGNE/RETRAITE','PU / VL'];
                      entry.product = products[rnd(0, products.length-1)];
                      entry.contractNumber = randomContract('AN');
                      entry.effectiveDateIso = iso(day);
                      if (entry.product === 'PU / VL') {
                        entry.versementLibre = rnd(200, 3000);
                        entry.commissionEur = Math.round(entry.versementLibre * 0.01);
                      } else {
                        entry.primeAnnuelle = rnd(200, 3000);
                        entry.commissionEur = rnd(10, 120);
                      }
                    } else {
                      entry.type = 'PROCESS';
                      const kinds = ['M+3','Préterme Auto','Préterme IRD'];
                      entry.process = kinds[rnd(0, kinds.length-1)];
                    }
                    commRaw.push(entry);
                  }
                }
                localStorage.setItem('cdc_entries', JSON.stringify(commRaw));

                // Santé individuelle
                const indEmails = emailsBy(u=> norm(u.role).includes('cdc_sante_ind'));
                const indRaw = JSON.parse(localStorage.getItem('cdc_sante_entries')||'[]');
                for (const email of indEmails) {
                  for (let i=0;i<10;i++) {
                    const day = new Date(begin.getFullYear(), begin.getMonth(), rnd(1,28));
                    const acts = ['Affaire nouvelle','Révision','Adhésion groupe','Courtage → Allianz','Allianz → Courtage'];
                    const act = acts[rnd(0, acts.length-1)];
                    const brut = rnd(100, 2500);
                    const weight = act === 'Affaire nouvelle' ? 1.0 : act === 'Courtage → Allianz' ? 0.75 : 0.5;
                    const pondere = Math.round(brut * weight);
                    const company = act === 'Affaire nouvelle' ? (Math.random() < 0.6 ? 'Allianz' : 'Courtage') : undefined;
                    indRaw.push({
                      id: Math.random().toString(36).slice(2,10),
                      act,
                      clientName: randomName('Client IND'),
                      contractNumber: randomContract('SI'),
                      effectiveDateIso: iso(day),
                      caEur: brut,
                      caPondereEur: pondere,
                      createdAtIso: new Date(day.getTime()+rnd(0, 86400000)).toISOString(),
                      dayIso: iso(day),
                      company,
                      authorEmail: email,
                      mock: true,
                    });
                  }
                }
                localStorage.setItem('cdc_sante_entries', JSON.stringify(indRaw));

                // Santé collective
                const collEmails = emailsBy(u=> norm(u.role).includes('cdc_sante_coll'));
                const collRaw = JSON.parse(localStorage.getItem('cdc_sante_coll_entries')||'[]');
                for (const email of collEmails) {
                  for (let i=0;i<10;i++) {
                    const day = new Date(begin.getFullYear(), begin.getMonth(), rnd(1,28));
                    const natures = [
                      'coll an santé','coll an prev','coll an retraite','coll adhésion / renfort','coll révision',
                      'ind an santé','ind an prev','ind an retraite','courtage → allianz (ind & coll)','allianz → court (ind & coll)'
                    ];
                    const origines = ['proactif','réactif','prospection'];
                    const nature = natures[rnd(0, natures.length-1)];
                    const origine = origines[rnd(0, origines.length-1)] as any;
                    const compagnie = Math.random() < 0.7 ? 'allianz' : 'courtage';
                    const brut = rnd(200, 5000);
                    const taux = origine === 'proactif' ? 1 : origine === 'réactif' ? 0.5 : 1.2;
                    const pondere = Math.round(brut * taux);
                    collRaw.push({
                      id: Math.random().toString(36).slice(2,10),
                      dayIso: iso(day),
                      createdAtIso: new Date(day.getTime()+rnd(0, 86400000)).toISOString(),
                      authorEmail: email,
                      nature,
                      origine,
                      compagnie,
                      client: randomName('Client COLL'),
                      contractNumber: randomContract('SC'),
                      primeBrute: brut,
                      primePonderee: pondere,
                      mock: true,
                    });
                  }
                }
                localStorage.setItem('cdc_sante_coll_entries', JSON.stringify(collRaw));
              } finally {
                setBusy(false);
                setRefresh(v=>v+1);
              }
            }}>{busy ? '…' : 'Générer données mock'}</button>
            <button disabled={busy} className="btn btn-ghost" title="Supprimer toutes les entrées mock de ce mois" onClick={() => {
              setBusy(true);
              try {
                const starts = monthKey;
                const clean = (key:string)=>{
                  const raw = JSON.parse(localStorage.getItem(key)||'[]');
                  const next = raw.filter((e:any)=> !(e.mock && (e.dayIso||'').startsWith(starts)));
                  localStorage.setItem(key, JSON.stringify(next));
                };
                clean('cdc_entries');
                clean('cdc_sante_entries');
                clean('cdc_sante_coll_entries');
              } finally {
                setBusy(false);
                setRefresh(v=>v+1);
              }
            }}>Supprimer données mock</button>
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
        {(() => {
          // Table par CDC + total
          const normalize = (r: string) => r.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
          const commercialEmails = users.filter(u => normalize(u.role).includes('cdc_commercial')).map(u => u.email);
          const displayName: Record<string,string> = Object.fromEntries(users.map(u=>[u.email, `${u.firstName} ${u.lastName}`]));
          const rows = commercialEmails.map(email => ({ email, ...(agg.commByUser[email] || { an:0, process:0, ca:0, payable:0 }) }));
          const total = rows.reduce((acc, r:any)=>{ acc.an+=r.an; acc.process+=r.process; acc.ca+=r.ca; acc.payable+=r.payable||0; return acc; }, {an:0,process:0,ca:0,payable:0});
          return (
            <div className="mt-3 overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
              <table className="min-w-full text-sm table-auto">
                <thead className="bg-white/80 dark:bg-white/10 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="p-2 text-left">CDC</th>
                    <th className="p-2 text-right">AN</th>
                    <th className="p-2 text-right">Process</th>
                    <th className="p-2 text-right">CA</th>
                    <th className="p-2 text-right">Com (à verser)</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="odd:bg-white/60 even:bg-white/40 dark:odd:bg-white/10 dark:even:bg-white/5">
                  {rows.map((r:any, idx:number)=> (
                    <tr key={r.email} className={idx === 0 ? "" : "border-t border-black/10 dark:border-white/10"}>
                      <td className="p-2">{displayName[r.email] || r.email}</td>
                      <td className="p-2 text-right">{r.an}</td>
                      <td className="p-2 text-right">{r.process}</td>
                      <td className="p-2 text-right">{euro(r.ca)}</td>
                      <td className="p-2 text-right">{euro(r.payable || 0)}</td>
                      <td className="p-2 text-right"><button className="btn btn-ghost" title="Voir le détail" onClick={()=> setDetail({ role:'comm', email:r.email, open:true })}>👁️</button></td>
                    </tr>
                  ))}
                  <tr className="border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 font-semibold">
                    <td className="p-2">Total</td>
                    <td className="p-2 text-right">{total.an}</td>
                    <td className="p-2 text-right">{total.process}</td>
                    <td className="p-2 text-right">{euro(total.ca)}</td>
                    <td className="p-2 text-right">{euro(total.payable)}</td>
                    <td className="p-2" />
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}
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
        {(() => {
          const normalize = (r: string) => r.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
          const emails = users.filter(u => normalize(u.role).includes('cdc_sante_ind')).map(u=>u.email);
          const displayName: Record<string,string> = Object.fromEntries(users.map(u=>[u.email, `${u.firstName} ${u.lastName}`]));
          const rows = emails.map(email => ({ email, ...( (agg.indByUser || {})[email] || { brut:0, pondere:0, payable:0 }) }));
          const total = rows.reduce((acc:any,r:any)=>{ acc.brut+=r.brut||0; acc.pondere+=r.pondere||0; acc.payable+=r.payable||0; return acc; }, {brut:0,pondere:0,payable:0});
          return (
            <div className="mt-3 overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
              <table className="min-w-full text-sm table-auto">
                <thead className="bg-white/80 dark:bg-white/10 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="p-2 text-left">CDC</th>
                    <th className="p-2 text-right">CA brut</th>
                    <th className="p-2 text-right">CA pondéré</th>
                    <th className="p-2 text-right">Com (à verser)</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="odd:bg-white/60 even:bg-white/40 dark:odd:bg-white/10 dark:even:bg-white/5">
                  {rows.map((r:any, idx:number)=> (
                    <tr key={r.email} className={idx === 0 ? "" : "border-t border-black/10 dark:border-white/10"}>
                      <td className="p-2">{displayName[r.email] || r.email}</td>
                      <td className="p-2 text-right">{euro(r.brut)}</td>
                      <td className="p-2 text-right">{euro(r.pondere)}</td>
                      <td className="p-2 text-right">{euro(r.payable || 0)}</td>
                      <td className="p-2 text-right"><button className="btn btn-ghost" title="Voir le détail" onClick={()=> setDetail({ role:'ind', email:r.email, open:true })}>👁️</button></td>
                    </tr>
                  ))}
                  <tr className="border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 font-semibold">
                    <td className="p-2">Total</td>
                    <td className="p-2 text-right">{euro(total.brut)}</td>
                    <td className="p-2 text-right">{euro(total.pondere)}</td>
                    <td className="p-2 text-right">{euro(total.payable)}</td>
                    <td className="p-2" />
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}
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
        {(() => {
          const normalize = (r: string) => r.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
          const emails = users.filter(u => normalize(u.role).includes('cdc_sante_coll')).map(u=>u.email);
          const displayName: Record<string,string> = Object.fromEntries(users.map(u=>[u.email, `${u.firstName} ${u.lastName}`]));
          const rows = emails.map(email => ({ email, ...(agg.collByUser[email] || { brut:0, pondere:0, commission:0 }) }));
          const total = rows.reduce((acc:any,r:any)=>{ acc.brut+=r.brut||0; acc.pondere+=r.pondere||0; acc.commission+=r.commission||0; return acc; }, {brut:0,pondere:0,commission:0});
          return (
            <div className="mt-3 overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
              <table className="min-w-full text-sm table-auto">
                <thead className="bg-white/80 dark:bg-white/10 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="p-2 text-left">CDC</th>
                    <th className="p-2 text-right">Prime brute</th>
                    <th className="p-2 text-right">Prime pondérée</th>
                    <th className="p-2 text-right">Com (à verser)</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="odd:bg-white/60 even:bg-white/40 dark:odd:bg-white/10 dark:even:bg-white/5">
                  {rows.map((r:any, idx:number)=> (
                    <tr key={r.email} className={idx === 0 ? "" : "border-t border-black/10 dark:border-white/10"}>
                      <td className="p-2">{displayName[r.email] || r.email}</td>
                      <td className="p-2 text-right">{euro(r.brut)}</td>
                      <td className="p-2 text-right">{euro(r.pondere)}</td>
                      <td className="p-2 text-right">{euro(r.commission)}</td>
                      <td className="p-2 text-right"><button className="btn btn-ghost" title="Voir le détail" onClick={()=> setDetail({ role:'coll', email:r.email, open:true })}>👁️</button></td>
                    </tr>
                  ))}
                  <tr className="border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 font-semibold">
                    <td className="p-2">Total</td>
                    <td className="p-2 text-right">{euro(total.brut)}</td>
                    <td className="p-2 text-right">{euro(total.pondere)}</td>
                    <td className="p-2 text-right">{euro(total.commission)}</td>
                    <td className="p-2" />
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      <div className="card">
        <h2 className="section-title mb-1">Total agence</h2>
        <div>Commissions à verser (tous rôles): <b>{euro(agg.totalCommissionPayable)}</b></div>
      </div>

      {detail?.open && (
        <AppModal
          open={detail.open}
          onClose={() => setDetail(null)}
          title={`Détail du mois · ${users.find(u=>u.email===detail.email)?.firstName || ''} ${users.find(u=>u.email===detail.email)?.lastName || ''}`}
          accentClass={detail.role==='comm' ? 'grad-amber' : detail.role==='ind' ? 'grad-emerald' : 'grad-sky'}
          maxWidthClass="max-w-3xl"
          primaryLabel="Fermer"
        >
          {(() => {
            const monthFilter = (d:string)=> d?.startsWith(monthKey);
            const labelFromEmail = (email:string)=> `${users.find(u=>u.email===email)?.firstName || email} ${users.find(u=>u.email===email)?.lastName || ''}`.trim();
            const name = labelFromEmail(detail.email);
            if (detail.role === 'comm') {
              const raw = JSON.parse(localStorage.getItem('cdc_entries') || '[]');
              const items = raw.filter((e:any)=> monthFilter(e.dayIso) && (e.authorEmail===detail.email));
              const an = items.filter((e:any)=> e.type==='AN');
              const process = items.filter((e:any)=> e.type!=='AN');
              const ca = an.reduce((s:number,e:any)=> s + (e.product==='PU / VL' ? (e.versementLibre||0) : (e.primeAnnuelle||0)), 0);
              const commission = an.reduce((s:number,e:any)=> s + (e.commissionEur||0), 0);
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span>CDC: <b>{name}</b></span>
                    <span>AN: <b>{an.length}</b></span>
                    <span>Process: <b>{process.length}</b></span>
                    <span>CA: <b>{euro(ca)}</b></span>
                    <span>Commissions: <b>{euro(commission)}</b></span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
                    <table className="min-w-full text-sm table-auto">
                      <thead className="bg-white/80 dark:bg-white/10 text-xs uppercase tracking-wide">
                        <tr>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Type</th>
                          <th className="p-2 text-right">CA</th>
                          <th className="p-2 text-right">Commission</th>
                        </tr>
                      </thead>
                      <tbody className="odd:bg-white/60 even:bg-white/40 dark:odd:bg-white/10 dark:even:bg-white/5">
                        {items.map((e:any, idx:number)=> (
                          <tr key={idx} className={idx===0?'' : 'border-t border-black/10 dark:border-white/10'}>
                            <td className="p-2">{e.dayIso}</td>
                            <td className="p-2">{e.type}</td>
                            <td className="p-2 text-right">{euro(e.product==='PU / VL' ? (e.versementLibre||0) : (e.primeAnnuelle||0))}</td>
                            <td className="p-2 text-right">{euro(e.commissionEur||0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="modal-actions">
                    <button className="btn" onClick={()=>{
                      try {
                        const header = ['Date','Type','CA','Commission'];
                        const rows = items.map((e:any)=> [e.dayIso, e.type, (e.product==='PU / VL' ? (e.versementLibre||0) : (e.primeAnnuelle||0)), (e.commissionEur||0)]);
                        const csv = [header, ...rows].map(r=> r.join(';')).join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `commercial_${name}_${monthKey}.csv`; a.click(); URL.revokeObjectURL(url);
                      } catch {}
                    }}>Exporter CSV</button>
                    <a href="/dashboard/cdc-commercial" className="btn btn-ghost">Ouvrir le module</a>
                  </div>
                </div>
              );
            }
            if (detail.role === 'ind') {
              const raw = JSON.parse(localStorage.getItem('cdc_sante_entries') || '[]');
              const items = raw.filter((e:any)=> monthFilter(e.dayIso) && (e.authorEmail===detail.email));
              const brut = items.reduce((s:number,e:any)=> s + (e.caEur||0), 0);
              const pondere = items.reduce((s:number,e:any)=> s + (e.caPondereEur||0), 0);
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span>CDC: <b>{name}</b></span>
                    <span>CA brut: <b>{euro(brut)}</b></span>
                    <span>CA pondéré: <b>{euro(pondere)}</b></span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
                    <table className="min-w-full text-sm table-auto">
                      <thead className="bg-white/80 dark:bg-white/10 text-xs uppercase tracking-wide">
                        <tr>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Client</th>
                          <th className="p-2 text-right">CA brut</th>
                          <th className="p-2 text-right">CA pondéré</th>
                        </tr>
                      </thead>
                      <tbody className="odd:bg-white/60 even:bg-white/40 dark:odd:bg-white/10 dark:even:bg-white/5">
                        {items.map((e:any, idx:number)=> (
                          <tr key={idx} className={idx===0?'' : 'border-t border-black/10 dark:border-white/10'}>
                            <td className="p-2">{e.dayIso}</td>
                            <td className="p-2">{e.clientName}</td>
                            <td className="p-2 text-right">{euro(e.caEur||0)}</td>
                            <td className="p-2 text-right">{euro(e.caPondereEur||0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="modal-actions">
                    <button className="btn" onClick={()=>{
                      try {
                        const header = ['Date','Client','CA brut','CA pondéré'];
                        const rows = items.map((e:any)=> [e.dayIso, e.clientName, (e.caEur||0), (e.caPondereEur||0)]);
                        const csv = [header, ...rows].map(r=> r.join(';')).join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `sante_ind_${name}_${monthKey}.csv`; a.click(); URL.revokeObjectURL(url);
                      } catch {}
                    }}>Exporter CSV</button>
                    <a href="/dashboard/cdc-sante-ind" className="btn btn-ghost">Ouvrir le module</a>
                  </div>
                </div>
              );
            }
            // coll
            const raw = JSON.parse(localStorage.getItem('cdc_sante_coll_entries') || '[]');
            const items = raw.filter((e:any)=> monthFilter(e.dayIso) && (e.authorEmail===detail.email));
            const brut = items.reduce((s:number,e:any)=> s + (e.primeBrute||0), 0);
            const pondere = items.reduce((s:number,e:any)=> s + (e.primePonderee||0), 0);
            return (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3 text-sm">
                  <span>CDC: <b>{name}</b></span>
                  <span>Prime brute: <b>{euro(brut)}</b></span>
                  <span>Prime pondérée: <b>{euro(pondere)}</b></span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
                  <table className="min-w-full text-sm table-auto">
                    <thead className="bg-white/80 dark:bg-white/10 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Client</th>
                        <th className="p-2 text-right">Prime brute</th>
                        <th className="p-2 text-right">Prime pondérée</th>
                      </tr>
                    </thead>
                    <tbody className="odd:bg-white/60 even:bg-white/40 dark:odd:bg-white/10 dark:even:bg-white/5">
                      {items.map((e:any, idx:number)=> (
                        <tr key={idx} className={idx===0?'' : 'border-t border-black/10 dark:border-white/10'}>
                          <td className="p-2">{e.dayIso}</td>
                          <td className="p-2">{e.clientName}</td>
                          <td className="p-2 text-right">{euro(e.primeBrute||0)}</td>
                          <td className="p-2 text-right">{euro(e.primePonderee||0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="modal-actions">
                  <button className="btn" onClick={()=>{
                    try {
                      const header = ['Date','Client','Prime brute','Prime pondérée'];
                      const rows = items.map((e:any)=> [e.dayIso, e.clientName, (e.primeBrute||0), (e.primePonderee||0)]);
                      const csv = [header, ...rows].map(r=> r.join(';')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `sante_coll_${name}_${monthKey}.csv`; a.click(); URL.revokeObjectURL(url);
                    } catch {}
                  }}>Exporter CSV</button>
                  <a href="/dashboard/cdc-sante-coll" className="btn btn-ghost">Ouvrir le module</a>
                </div>
              </div>
            );
          })()}
        </AppModal>
      )}
    </div>
  );
}


