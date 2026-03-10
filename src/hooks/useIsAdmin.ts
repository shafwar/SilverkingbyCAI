"use client";

import { useEffect, useState } from "react";

/**
 * Returns whether the current user is an admin (from /api/admin/me).
 * Uses sessionStorage cache (same key as Navbar) so edit icons show immediately when already logged in as admin.
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("isAdmin") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/admin/me");
        if (!res.ok) return;
        const data = await res.json();
        const adminStatus = data?.isAdmin === true;
        if (!cancelled) {
          setIsAdmin(adminStatus);
          try {
            sessionStorage.setItem("isAdmin", String(adminStatus));
          } catch {
            // ignore
          }
        }
      } catch {
        if (!cancelled) {
          try {
            const cached = sessionStorage.getItem("isAdmin") === "true";
            if (!cached) setIsAdmin(false);
          } catch {
            setIsAdmin(false);
          }
        }
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
