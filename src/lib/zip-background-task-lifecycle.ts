"use client";

import {
  clearZipBackgroundTask,
  writeZipBackgroundTask,
  type ZipBackgroundTask,
} from "@/lib/zip-background-task-store";

export const ZIP_MONITORING_ABORT_EVENT = "sk-zip-monitoring-abort";
export const ZIP_MONITORING_CANCELLED_EVENT = "sk-zip-monitoring-cancelled";

function dispatchZipMonitoringAbort(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ZIP_MONITORING_ABORT_EVENT));
  }
}

function dispatchZipMonitoringCancelled(detail?: { reason?: string }): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ZIP_MONITORING_CANCELLED_EVENT, { detail }));
  }
}

/** Clear background task + floating UI after job fully handled. */
export function finishAndClearZipBackgroundTask(resetDownload?: () => void): void {
  dispatchZipMonitoringAbort();
  clearZipBackgroundTask();
  resetDownload?.();
  dispatchZipMonitoringCancelled({ reason: "finished" });
}

/** User cancelled monitoring — stop runner immediately, clear UI, notify page. */
export function cancelZipBackgroundMonitoringAndReset(resetDownload?: () => void): void {
  dispatchZipMonitoringAbort();
  clearZipBackgroundTask();
  resetDownload?.();
  dispatchZipMonitoringCancelled({ reason: "user-cancel" });
}

/** Start or replace a background ZIP task and sync DownloadContext floating UI. */
export function beginZipBackgroundTask(
  task: Omit<ZipBackgroundTask, "createdAt" | "updatedAt"> & {
    createdAt?: number;
    updatedAt?: number;
  },
  syncUi?: {
    setDownloadPercent: (n: number | null) => void;
    setDownloadLabel: (label: string) => void;
    setIsDownloadMinimized?: (minimized: boolean) => void;
    /** Compact bottom-right card instead of fullscreen overlay (default false). */
    startMinimized?: boolean;
  }
): ZipBackgroundTask {
  const now = Date.now();
  const full: ZipBackgroundTask = {
    ...task,
    createdAt: task.createdAt ?? now,
    updatedAt: task.updatedAt ?? now,
  };
  writeZipBackgroundTask(full);
  if (syncUi) {
    syncUi.setDownloadPercent(Math.max(0, Math.min(100, Math.round(full.progressPercent))));
    syncUi.setDownloadLabel(full.progressLabel || "ZIP diproses di background...");
    syncUi.setIsDownloadMinimized?.(syncUi.startMinimized ?? false);
  }
  return full;
}

export function finishZipBackgroundUi(
  syncUi: {
    setDownloadPercent: (n: number | null) => void;
    setDownloadLabel: (label: string) => void;
  },
  delayMs = 2500
): void {
  syncUi.setDownloadPercent(100);
  syncUi.setDownloadLabel("Selesai — ZIP terunduh");
  window.setTimeout(() => {
    syncUi.setDownloadPercent(null);
    syncUi.setDownloadLabel("");
  }, delayMs);
}
