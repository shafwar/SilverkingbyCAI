"use client";

import { SessionProvider } from "next-auth/react";
import { AdminStatusProvider } from "@/contexts/AdminStatusProvider";

/**
 * Shared client providers for all public routes using `<Providers>`.
 * AdminStatusProvider MUST live here (not only in [locale]/layout) so /verify/*
 * and any other non-locale routes that render Navbar do not crash.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AdminStatusProvider>{children}</AdminStatusProvider>
    </SessionProvider>
  );
}

