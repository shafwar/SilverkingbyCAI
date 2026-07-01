"use client";

import { useAdminStatus } from "@/contexts/AdminStatusProvider";

/** Whether the current user is an admin — single shared fetch via AdminStatusProvider. */
export function useIsAdmin(): boolean {
  return useAdminStatus().isAdmin;
}
