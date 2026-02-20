"use client";

import { useEffect, useState } from "react";

/**
 * Returns whether the current user is an admin (from /api/admin/me).
 * Use to show admin-only UI (e.g. Edit content link) on public pages.
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/admin/me");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.isAdmin) setIsAdmin(true);
      } catch {
        // silent
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
