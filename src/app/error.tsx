"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-lg card text-center">
        <h1 className="heading-hero mb-2">Une erreur est survenue</h1>
        <p className="subtle mb-6">Veuillez réessayer. Si le problème persiste, retournez à l’accueil.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => reset()} className="btn btn-primary">Réessayer</button>
          <a href="/" className="btn btn-ghost">Retour à l’accueil</a>
        </div>
      </div>
    </div>
  );
}


