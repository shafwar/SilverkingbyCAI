"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearAdminStatusCache as clearAdminCache,
  fetchAdminStatusNetwork,
  readAdminStatusCache,
} from "@/lib/admin-status-client";

type AdminStatusContextValue = {
  isAdmin: boolean;
  isLoading: boolean;
  refreshAdminStatus: () => Promise<boolean>;
};

const AdminStatusContext = createContext<AdminStatusContextValue | undefined>(undefined);

export function AdminStatusProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAdminStatus = useCallback(async () => {
    const status = await fetchAdminStatusNetwork();
    setIsAdmin(status);
    setIsLoading(false);
    return status;
  }, []);

  useEffect(() => {
    const cached = readAdminStatusCache();
    if (cached !== null) {
      setIsAdmin(cached);
      setIsLoading(false);
    }

    const run = () => {
      void refreshAdminStatus();
    };

    if (typeof window === "undefined") return;

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = globalThis.setTimeout(run, 400);
    return () => globalThis.clearTimeout(t);
  }, [refreshAdminStatus]);

  const value = useMemo(
    () => ({ isAdmin, isLoading, refreshAdminStatus }),
    [isAdmin, isLoading, refreshAdminStatus]
  );

  return <AdminStatusContext.Provider value={value}>{children}</AdminStatusContext.Provider>;
}

/** Invalidate cache after admin login/logout (optional). */
export function clearAdminStatusCache(): void {
  clearAdminCache();
}

export function useAdminStatus(): AdminStatusContextValue {
  const ctx = useContext(AdminStatusContext);
  if (!ctx) {
    throw new Error("useAdminStatus must be used within AdminStatusProvider");
  }
  return ctx;
}
