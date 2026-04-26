"use client";

import { AuthUser } from "@partner-hub/shared";

const KEY = "partner-hub-session";

export type Session = {
  accessToken: string;
  user: AuthUser;
};

export function getSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function setSession(session: Session) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(KEY);
}
