"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [email, setEmail] = useState("");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const isDevHostAllowed = useMemo(() => {
    if (typeof window === "undefined") return false;
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
  }, []);

  const isEmailDomainValid = useMemo(() => {
    if (!email) return true; // pas de blocage tant que vide
    return email.trim().toLowerCase().endsWith("@allianz-nogaro.fr");
  }, [email]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    const allowed = host === "allianz-nogaro.fr" || isDevHostAllowed;
    if (!allowed) {
      setIsBlocked(true);
      alert("Connexion impossible : le nom de domaine n'est pas autorisé.");
    }
  }, [isDevHostAllowed]);

  return (
    <main className="relative min-h-screen flex items-center justify-center px-6">
      <Image
        src="/hello.jpg"
        alt="Fond de connexion"
        fill
        priority
        className="object-cover blur-sm"
      />
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 w-full max-w-md card">
        <h1 className="heading-hero mb-2">Se connecter</h1>
        <p className="text-sm subtle mb-4">Accédez à votre espace sécurisé.</p>

        <div className="mb-4 rounded-lg border border-amber-300/60 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/50 p-3">
          Accès réservé aux adresses e‑mail du domaine <span className="font-mono">allianz-nogaro.fr</span>.
        </div>

        {isBlocked && (
          <div className="mb-4 rounded-lg border border-red-300/60 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200 dark:border-red-900/50 p-3">
            Connexion impossible : domaine non autorisé. Utilisez <span className="font-mono">allianz-nogaro.fr</span>.
          </div>
        )}

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const session = signIn(email, "");
            if (session) {
              router.push("/dashboard");
            }
          }}
        >
          <div>
            <label className="block text-sm mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="vous@allianz-nogaro.fr"
              disabled={isBlocked}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {!isEmailDomainValid && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-300">Utilisez une adresse se terminant par <span className="font-mono">@allianz-nogaro.fr</span>.</p>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="password">Mot de passe</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="input pr-20"
                placeholder="••••••••"
                disabled={isBlocked}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs bg-white/60 backdrop-blur border border-black/10"
                aria-pressed={showPassword}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isBlocked}
            className="btn btn-primary w-full"
          >
            Se connecter
          </button>
        </form>
      </div>
    </main>
  );
}


