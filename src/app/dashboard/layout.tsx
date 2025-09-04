"use client";

import Image from "next/image";
import Link from "next/link";
import { getCurrentSession, signOut } from "@/lib/auth";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const session = getCurrentSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setEmail(session.email);
    setRole(session.role);
  }, [router]);

  const pathname = usePathname();

  const navItems = useMemo(() => {
    const items = [{ href: "/dashboard", label: "Accueil" }];
    if (role && role.toLowerCase().includes("cdc_commercial")) {
      items.push({ href: "/dashboard/cdc-commercial", label: "Activité commerciale" });
    }
    return items;
  }, [role]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="relative min-h-screen grid grid-cols-[232px_1fr] grid-rows-[64px_1fr]">
      <Image src="/if.jpg" alt="Fond dashboard" fill priority className="object-cover blur-sm" />
      <div className="absolute inset-0 bg-black/20" />
      <header className="col-span-2 h-16 backdrop-blur-xl bg-white/50 dark:bg-black/20 border-b border-black/10 dark:border-white/10 flex items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/allianz.svg" alt="Allianz" width={120} height={31} />
          <span className="font-medium">Allianz Saas</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex badge">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            connecté
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


