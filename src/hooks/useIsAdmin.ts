"use client";

import { useOptionalAdminStatus } from "@/contexts/AdminStatusProvider";

/** Whether the current user is an admin — single shared fetch via AdminStatusProvider. */
export function useIsAdmin(): boolean {
  return useOptionalAdminStatus()?.isAdmin ?? false;
}
