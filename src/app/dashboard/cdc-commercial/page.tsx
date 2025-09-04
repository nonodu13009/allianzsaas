"use client";

import { getCurrentSession } from "@/lib/auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CdcCommercialPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getCurrentSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const role = session.role.toLowerCase();
    if (!role.includes("cdc_commercial")) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="card">
      <h1 className="section-title mb-2">Activité commerciale</h1>
      <p className="subtle">Zone réservée aux profils CDC Commercial. Dites-moi les éléments à afficher et je l’implémente.</p>
    </div>
  );
}


