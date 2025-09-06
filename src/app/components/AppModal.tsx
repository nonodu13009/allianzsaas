"use client";

import React from "react";

export type AppModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  accentClass?: string; // ex: grad-sky
  children: React.ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
};

export default function AppModal({ open, title, onClose, accentClass = "grad-sky", children, primaryLabel = "OK", onPrimary }: AppModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55">
      <div className="modal-card w-full max-w-md">
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


