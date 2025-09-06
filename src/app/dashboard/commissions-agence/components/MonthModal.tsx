"use client";

import { useEffect, useState } from "react";
import AppModal from "@/app/components/AppModal";
import type { MonthData } from "../types";

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

export default function MonthModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: MonthData;
  onClose: () => void;
  onSave: (data: MonthData) => void;
}) {
  // Local string fields for better UX (empty instead of 0, easy selection)
  const [fields, setFields] = useState({
    iard: "",
    vie: "",
    courtage: "",
    profits: "",
    charges: "",
    prevJulien: "",
    prevJM: "",
  });

  useEffect(() => {
    setFields({
      iard: initial.commissions.iard ? String(initial.commissions.iard) : "",
      vie: initial.commissions.vie ? String(initial.commissions.vie) : "",
      courtage: initial.commissions.courtage ? String(initial.commissions.courtage) : "",
      profits: initial.commissions.profitsExceptionnels ? String(initial.commissions.profitsExceptionnels) : "",
      charges: initial.charges ? String(initial.charges) : "",
      prevJulien: initial.prelevements?.Julien ? String(initial.prelevements.Julien) : "",
      prevJM: initial.prelevements?.["Jean-Michel"] ? String(initial.prelevements["Jean-Michel"]) : "",
    });
  }, [initial]);

  const toNum = (s: string): number => {
    if (!s) return 0;
    const n = Number(String(s).replace(/,/g, "."));
    return isFinite(n) && n >= 0 ? n : 0;
  };

  const totalCommissions = toNum(fields.iard) + toNum(fields.vie) + toNum(fields.courtage) + toNum(fields.profits);
  const result = totalCommissions - toNum(fields.charges);
  const monthLabel = MONTH_LABELS[initial.month - 1];

  const save = () => {
    const isCompleted = totalCommissions > 0 || toNum(fields.charges) > 0 || (toNum(fields.prevJulien) + toNum(fields.prevJM)) > 0;
    const payload: MonthData = {
      month: initial.month,
      commissions: {
        iard: toNum(fields.iard),
        vie: toNum(fields.vie),
        courtage: toNum(fields.courtage),
        profitsExceptionnels: toNum(fields.profits),
      },
      charges: toNum(fields.charges),
      prelevements: {
        Julien: toNum(fields.prevJulien),
        "Jean-Michel": toNum(fields.prevJM),
      },
      completed: isCompleted,
    };
    onSave(payload);
    onClose();
  };

  return (
    <AppModal open={open} title={`Saisie — ${monthLabel}`} onClose={onClose} primaryLabel="Enregistrer" onPrimary={save} maxWidthClass="max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Commissions IARD</label>
          <input type="text" inputMode="numeric" placeholder="0" className="input" value={fields.iard}
            onFocus={(e)=> e.currentTarget.select()}
            onWheel={(e)=> (e.currentTarget as HTMLInputElement).blur()}
            onChange={(e)=> setFields((f)=> ({ ...f, iard: e.target.value }))} />
        </div>
        <div>
          <label className="label">Commissions Vie</label>
          <input type="text" inputMode="numeric" placeholder="0" className="input" value={fields.vie}
            onFocus={(e)=> e.currentTarget.select()}
            onWheel={(e)=> (e.currentTarget as HTMLInputElement).blur()}
            onChange={(e)=> setFields((f)=> ({ ...f, vie: e.target.value }))} />
        </div>
        <div>
          <label className="label">Commissions Courtage</label>
          <input type="text" inputMode="numeric" placeholder="0" className="input" value={fields.courtage}
            onFocus={(e)=> e.currentTarget.select()}
            onWheel={(e)=> (e.currentTarget as HTMLInputElement).blur()}
            onChange={(e)=> setFields((f)=> ({ ...f, courtage: e.target.value }))} />
        </div>
        <div>
          <label className="label">Profits exceptionnels</label>
          <input type="text" inputMode="numeric" placeholder="0" className="input" value={fields.profits}
            onFocus={(e)=> e.currentTarget.select()}
            onWheel={(e)=> (e.currentTarget as HTMLInputElement).blur()}
            onChange={(e)=> setFields((f)=> ({ ...f, profits: e.target.value }))} />
        </div>
        <div>
          <label className="label">Charges</label>
          <input type="text" inputMode="numeric" placeholder="0" className="input" value={fields.charges}
            onFocus={(e)=> e.currentTarget.select()}
            onWheel={(e)=> (e.currentTarget as HTMLInputElement).blur()}
            onChange={(e)=> setFields((f)=> ({ ...f, charges: e.target.value }))} />
        </div>
        <div>
          <label className="label">Prélèvements — Julien</label>
          <input type="text" inputMode="numeric" placeholder="0" className="input" value={fields.prevJulien}
            onFocus={(e)=> e.currentTarget.select()}
            onWheel={(e)=> (e.currentTarget as HTMLInputElement).blur()}
            onChange={(e)=> setFields((f)=> ({ ...f, prevJulien: e.target.value }))} />
        </div>
        <div>
          <label className="label">Prélèvements — Jean‑Michel</label>
          <input type="text" inputMode="numeric" placeholder="0" className="input" value={fields.prevJM}
            onFocus={(e)=> e.currentTarget.select()}
            onWheel={(e)=> (e.currentTarget as HTMLInputElement).blur()}
            onChange={(e)=> setFields((f)=> ({ ...f, prevJM: e.target.value }))} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="badge badge-lg">Total commissions: {totalCommissions.toLocaleString()}</div>
        <div className="badge badge-lg">Charges: {toNum(fields.charges).toLocaleString()}</div>
        <div className={`badge badge-lg ${result >= 0 ? "badge-success" : "badge-error"}`}>Résultat: {result.toLocaleString()}</div>
      </div>
    </AppModal>
  );
}


