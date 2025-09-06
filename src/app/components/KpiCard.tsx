"use client";

import { InformationCircleIcon } from "@heroicons/react/24/outline";
import React from "react";

export type KpiCardProps = {
  title: string;
  value: string | number;
  sub?: string;
  gradient: string; // tailwind gradient classes
  Icon?: React.ComponentType<any>;
  onInfo?: () => void;
};

export function KpiCard({ title, value, sub, gradient, Icon, onInfo }: KpiCardProps) {
  return (
    <div className={`rounded-2xl p-3 border border-white/20 dark:border-white/15 bg-white/5 dark:bg-black/20 backdrop-blur-md shadow-sm relative`}>
      <div className={`absolute inset-0 rounded-2xl ${gradient} opacity-20 -z-10`} />
      <div className="flex items-center gap-2">
        {Icon && (
          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${gradient}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="text-[12px] subtle">{title}</div>
        {onInfo && (
          <button
            className={`ml-auto inline-flex items-center justify-center w-7 h-7 rounded-full text-white shadow ring-2 ring-white/40 hover:brightness-110 focus:outline-none focus:ring-white/80 ${gradient}`}
            title={`À propos de ${title}`}
            aria-label={`Informations: ${title}`}
            onClick={onInfo}
          >
            <InformationCircleIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="mt-2 text-3xl font-semibold text-center leading-none tracking-tight">{value}</div>
      {sub && <div className="text-[11px] subtle mt-1 text-center">{sub}</div>}
    </div>
  );
}

export default KpiCard;


