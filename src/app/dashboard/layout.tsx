"use client";

import Image from "next/image";
import Link from "next/link";
import { getCurrentSession, signOut } from "@/lib/auth";
import { getRoleDisplayName } from "@/data/users";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [weather, setWeather] = useState<{ tempC: number; code: number } | null>(null);

  useEffect(() => {
    const session = getCurrentSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setEmail(session.email);
    setRole(session.role);
    setFullName(`${session.firstName} ${session.lastName}`);
  }, [router]);

  // Fetch current weather in Marseille via Open‑Meteo (no API key required)
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const url = "https://api.open-meteo.com/v1/forecast?latitude=43.2965&longitude=5.3698&current=temperature_2m,weather_code&timezone=auto";
        const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const tempC = data?.current?.temperature_2m;
        const code = data?.current?.weather_code;
        if (typeof tempC === "number" && typeof code === "number") {
          setWeather({ tempC, code });
        }
      } catch {
        // ignore network errors
      }
    })();
    return () => controller.abort();
  }, []);

  const weatherIcon = (code?: number) => {
    if (code === undefined || code === null) return "";
    // Map of WMO weather codes → emoji
    if ([0].includes(code)) return "☀️"; // Clear
    if ([1, 2].includes(code)) return "🌤️"; // Mainly clear/partly cloudy
    if ([3].includes(code)) return "☁️"; // Overcast
    if ([45, 48].includes(code)) return "🌫️"; // Fog
    if ([51, 53, 55, 56, 57].includes(code)) return "🌦️"; // Drizzle
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️"; // Rain
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️"; // Snow
    if ([95, 96, 99].includes(code)) return "⛈️"; // Thunderstorm
    return "🌡️";
  };

  const pathname = usePathname();

  const navItems = useMemo(() => {
    const items = [{ href: "/dashboard", label: "Accueil" }];
    const normalized = role
      ? role
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
      : "";
    if (normalized.includes("administrateur")) {
      items.push({ href: "/dashboard/synthese", label: "Synthèse commerciale" });
      items.push({ href: "/dashboard/commissions-agence", label: "Commissions agence" });
    }
    if (normalized.includes("cdc_commercial")) {
      items.push({ href: "/dashboard/cdc-commercial", label: "Mon activité" });
    }
    if (normalized.includes("cdc_sante_ind")) {
      items.push({ href: "/dashboard/cdc-sante-ind", label: "Mon activité" });
    }
    if (normalized.includes("cdc_sante_coll")) {
      items.push({ href: "/dashboard/cdc-sante-coll", label: "Mon activité" });
    }
    return items;
  }, [role]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (pathname === href) return true;
    // Do not treat the dashboard home as active for all subpaths
    if (href === "/dashboard") return false;
    return pathname.startsWith(href + "/");
  };

  return (
    <div className="relative min-h-screen grid grid-cols-[232px_1fr] grid-rows-[64px_1fr]">
      <Image src="/if.jpg" alt="Fond dashboard" fill priority className="object-cover blur-sm" />
      <div className="absolute inset-0 bg-black/20" />
      <header className="col-span-2 min-h-16 py-2 backdrop-blur-xl bg-white/50 dark:bg-black/20 border-b border-black/10 dark:border-white/10 flex items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src="/allianz.svg" alt="Allianz" width={132} height={34} />
          <span className="font-semibold text-base sm:text-lg">Allianz Saas</span>
        </Link>
        <div className="flex items-center gap-3">
          {weather && (
            <span
              className={
                "hidden lg:inline-flex badge badge-lg " +
                (weather.tempC <= 8
                  ? "temp-cold"
                  : weather.tempC <= 20
                  ? "temp-mild"
                  : weather.tempC <= 28
                  ? "temp-warm"
                  : "temp-hot")
              }
              title="Météo actuelle à Marseille"
            >
              {weatherIcon(weather.code)} {Math.round(weather.tempC)}°C Marseille
            </span>
          )}
          <span className="hidden md:inline-flex badge badge-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {fullName || email || "Connecté"}
          </span>
          {role && (
            <span className="hidden sm:inline-flex badge badge-lg">
              {getRoleDisplayName(role)}
            </span>
          )}
          <span className="hidden sm:inline-flex badge badge-lg">
            {new Date().toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
          </span>
          <button
            onClick={() => {
              signOut();
              router.push("/");
            }}
            className="btn btn-ghost text-sm"
          >
            Déconnexion
          </button>
        </div>
      </header>
      <aside className="row-start-2 bg-white/30 dark:bg-black/20 backdrop-blur-md border-r border-black/10 dark:border-white/10 p-4 relative z-10">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                `relative block rounded-lg px-3 py-2 text-sm transition-colors ` +
                (isActive(item.href)
                  ? `bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 shadow-sm pl-3.5`
                  : `hover:bg-black/5 dark:hover:bg-white/10`)
              }
            >
              {isActive(item.href) && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full bg-sky-500" />
              )}
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="row-start-2 col-start-2 p-6 relative z-10">{children}</main>
    </div>
  );
}


