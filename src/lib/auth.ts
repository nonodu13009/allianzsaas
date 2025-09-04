"use client";

import { users, type UserRecord, findUserByEmail } from "@/data/users";

export type Session = {
  email: string;
  role: string;
  firstName: string;
  lastName: string;
};

const STORAGE_KEY = "allianz_saas_session";

export function signIn(email: string, _password: string): Session | null {
  const user = findUserByEmail(email);
  if (!user) return null;
  const session: Session = {
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

export function signOut(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getCurrentSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getCurrentSession() !== null;
}


