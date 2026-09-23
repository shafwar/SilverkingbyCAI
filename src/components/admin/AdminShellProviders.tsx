"use client";

import type { ReactNode } from "react";
import { DownloadProvider } from "@/contexts/DownloadContext";
import { GlobalZipDownloadOverlay } from "@/components/admin/GlobalZipDownloadOverlay";

/** Admin-only providers — keeps zip/download UI off public pages. */
export function AdminShellProviders({ children }: { children: ReactNode }) {
  return (
    <DownloadProvider>
      {children}
      <GlobalZipDownloadOverlay />
    </DownloadProvider>
  );
}
