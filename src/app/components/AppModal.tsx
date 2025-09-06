"use client";

import React, { useEffect, useRef } from "react";

export type AppModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  accentClass?: string; // ex: grad-sky
  children: React.ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  maxWidthClass?: string; // ex: max-w-3xl
};

export default function AppModal({ open, title, onClose, accentClass = "grad-sky", children, primaryLabel = "OK", onPrimary, maxWidthClass = "max-w-md" }: AppModalProps) {
  if (!open) return null;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55" onClick={onClose}>
      <div ref={cardRef} className={`modal-card w-full ${maxWidthClass}`} onClick={(e)=> e.stopPropagation()}>
        <div className={`modal-accent ${accentClass}`} />
        <div className="flex items-start justify-between mb-2">
          <h3 className="modal-title">{title}</h3>
          <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onPrimary || onClose}>{primaryLabel}</button>
        </div>
      </div>
    </div>
  );
}


