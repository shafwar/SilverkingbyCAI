"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { useDownload } from "@/contexts/DownloadContext";
import {
  ZIP_BEFORE_UNLOAD_HINT,
  ZIP_NAV_BLOCKED_TOAST,
  cancelZipBackgroundMonitoring,
  hrefLeavesAdminArea,
  isZipBackgroundMonitoringActive,
} from "@/lib/zip-background-task-guard";

type Props = {
  isBlocking: boolean;
};

/**
 * Blocks leaving admin during active ZIP background monitoring:
 * - beforeunload / pagehide cleanup
 * - capture-phase click on external anchors
 * - redirect back if SPA lands outside /admin
 */
export function AdminZipNavigationGuard({ isBlocking }: Props) {
  const pathname = usePathname();
  const { resetDownload } = useDownload();

  useEffect(() => {
    if (!isBlocking) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ZIP_BEFORE_UNLOAD_HINT;
    };

    const onPageHide = () => {
      if (!isZipBackgroundMonitoringActive()) return;
      cancelZipBackgroundMonitoring();
      resetDownload();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [isBlocking, resetDownload]);

  useEffect(() => {
    if (!isBlocking) return;

    const onDocumentClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute("href") || "";
      if (!hrefLeavesAdminArea(href)) return;
      e.preventDefault();
      e.stopPropagation();
      toast.warning("Tidak dapat keluar admin", { description: ZIP_NAV_BLOCKED_TOAST, duration: 6000 });
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [isBlocking]);

  useEffect(() => {
    if (!isBlocking) return;
    if (pathname?.startsWith("/admin")) return;
    toast.error("Pemantauan ZIP dibatalkan", {
      description: "Anda meninggalkan halaman admin saat unduhan masih berjalan.",
      duration: 8000,
    });
    cancelZipBackgroundMonitoring();
    resetDownload();
    window.location.replace("/admin/qr-preview/page2");
  }, [pathname, isBlocking, resetDownload]);

  return null;
}
