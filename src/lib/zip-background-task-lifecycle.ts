"use client";

import {
  clearZipBackgroundTask,
  readZipBackgroundTask,
  updateZipBackgroundTask,
  writeZipBackgroundTask,
  type ZipBackgroundTask,
} from "@/lib/zip-background-task-store";
import { clearZipDownloadSessionLock } from "@/lib/zip-download-session-lock";
import { applyBatchProgressToTask } from "@/lib/zip-batch-progress";
import { markBatchDownloadedInBrowser } from "@/lib/zip-batch-download-tracker";
import { recordZipDownloadAuditClient } from "@/lib/zip-download-audit-client";
import { r2KeyFromDownloadUrl } from "@/lib/zip-r2-key";
import { triggerZipJobFileDownload, saveZipBatchPartToDevice } from "@/lib/zip-auto-download";

export const ZIP_MONITORING_ABORT_EVENT = "sk-zip-monitoring-abort";
export const ZIP_MONITORING_CANCELLED_EVENT = "sk-zip-monitoring-cancelled";
export const ZIP_BATCH_PROCEED_EVENT = "sk-zip-batch-proceed";

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

function dispatchZipBatchProceed(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ZIP_BATCH_PROCEED_EVENT));
  }
}

function auditConfirmedBatch(task: ZipBackgroundTask, batchIndex: number): void {
  if (!task.cacheKey) return;
  const part = task.downloads?.find((d) => d.batchIndex === batchIndex);
  const rk =
    part?.r2Key ||
    (part?.download_url ? r2KeyFromDownloadUrl(part.download_url) : null) ||
    undefined;
  if (!rk) return;
  void recordZipDownloadAuditClient({
    cacheKey: task.cacheKey,
    r2Key: rk,
    batchIndex,
    totalBatches: part?.totalBatches ?? task.downloads?.length ?? 1,
  });
}

/** Clear background task + floating UI after job fully handled. */
export function finishAndClearZipBackgroundTask(resetDownload?: () => void): void {
  dispatchZipMonitoringAbort();
  clearZipBackgroundTask();
  clearZipDownloadSessionLock();
  resetDownload?.();
  dispatchZipMonitoringCancelled({ reason: "finished" });
}

/** User cancelled monitoring — stop runner immediately, clear UI, notify page. */
export function cancelZipBackgroundMonitoringAndReset(resetDownload?: () => void): void {
  dispatchZipMonitoringAbort();
  clearZipBackgroundTask();
  clearZipDownloadSessionLock();
  resetDownload?.();
  dispatchZipMonitoringCancelled({ reason: "user-cancel" });
}

/** Admin confirmed batch file is on device — mark complete and allow next batch. */
export function confirmZipBatchProceed(): boolean {
  const task = updateZipBackgroundTask((t) => {
    if (!t?.awaitingProceed) return t;
    const { completedBatchIndex } = t.awaitingProceed;
    const downloads = (t.downloads ?? []).map((d) =>
      d.batchIndex === completedBatchIndex
        ? { ...d, downloaded: true, pendingSaveConfirm: false, downloadInFlight: false }
        : d
    );
    if (t.cacheKey) {
      markBatchDownloadedInBrowser(t.cacheKey, completedBatchIndex);
    }
    const merged: ZipBackgroundTask = {
      ...t,
      downloads,
      awaitingProceed: undefined,
      downloadsPaused: false,
      updatedAt: Date.now(),
    };
    auditConfirmedBatch(merged, completedBatchIndex);
    return applyBatchProgressToTask(merged);
  });
  if (!task) return false;
  dispatchZipBatchProceed();
  return true;
}

/** Admin wants to pause after current batch — resume later via proceed. */
export function pauseZipBatchDownloads(): boolean {
  const task = updateZipBackgroundTask((t) => {
    if (!t?.awaitingProceed) return t;
    return applyBatchProgressToTask({
      ...t,
      downloadsPaused: true,
      updatedAt: Date.now(),
    });
  });
  return !!task?.downloadsPaused;
}

/** Resume auto-download after pause (same awaitingProceed state). */
export function resumeZipBatchDownloads(): boolean {
  const task = updateZipBackgroundTask((t) => {
    if (!t?.awaitingProceed && !t?.downloadsPaused) return t;
    return applyBatchProgressToTask({
      ...t,
      downloadsPaused: false,
      updatedAt: Date.now(),
    });
  });
  if (!task) return false;
  dispatchZipBatchProceed();
  return true;
}

function safeBatchFilename(batchName: string): string {
  return (batchName || "batch").replace(/\s+/g, "-");
}

function applyBatchSaveSuccess(
  task: ZipBackgroundTask,
  batchIndex: number,
  savedVia: "save-picker" | "blob",
  savedBytes: number
): ZipBackgroundTask {
  const part = task.downloads?.find((d) => d.batchIndex === batchIndex);
  const totalBatches = part?.totalBatches ?? task.downloads?.[0]?.totalBatches ?? 1;
  const nextBatchIndex = batchIndex < totalBatches ? batchIndex + 1 : null;
  const downloads = (task.downloads ?? []).map((d) =>
    d.batchIndex === batchIndex
      ? { ...d, downloadInFlight: false, pendingSaveConfirm: true }
      : { ...d, downloadInFlight: false }
  );
  return applyBatchProgressToTask({
    ...task,
    downloads,
    downloadInFlight: false,
    activeDeviceBatchIndex: undefined,
    awaitingProceed: {
      completedBatchIndex: batchIndex,
      nextBatchIndex,
      totalBatches,
      savedVia,
      savedBytes,
    },
    downloadsPaused: false,
    updatedAt: Date.now(),
  });
}

/**
 * Simpan batch yang sudah ada di R2 ke laptop admin (bukan generate ulang di server).
 */
export async function saveZipBatchToDevice(batchIndex: number): Promise<boolean> {
  const task = readZipBackgroundTask();
  if (!task?.jobId) return false;
  const part = task.downloads?.find((d) => d.batchIndex === batchIndex);
  if (!part?.download_url?.trim()) {
    return false;
  }

  dispatchZipMonitoringAbort();

  updateZipBackgroundTask((t) => {
    if (!t) return t;
    return applyBatchProgressToTask({
      ...t,
      downloadInFlight: true,
      activeDeviceBatchIndex: batchIndex,
      awaitingProceed: undefined,
      downloads: (t.downloads ?? []).map((d) => ({
        ...d,
        downloadInFlight: d.batchIndex === batchIndex,
      })),
      updatedAt: Date.now(),
    });
  });

  const filename = `${safeBatchFilename(task.batchName)}-batch-${batchIndex}-of-${part.totalBatches}.zip`;
  const result = await saveZipBatchPartToDevice({
    filename,
    jobId: task.jobId,
    batchIndex,
    r2Key: part.r2Key,
    download_url: part.download_url,
    preferSavePicker: true,
  });

  if (!result.ok) {
    updateZipBackgroundTask((t) => {
      if (!t) return t;
      return applyBatchProgressToTask({
        ...t,
        downloadInFlight: false,
        activeDeviceBatchIndex: undefined,
        downloads: (t.downloads ?? []).map((d) => ({ ...d, downloadInFlight: false })),
        updatedAt: Date.now(),
      });
    });
    return false;
  }

  updateZipBackgroundTask((t) => {
    if (!t) return t;
    return applyBatchSaveSuccess(t, batchIndex, result.method, result.bytes);
  });
  dispatchZipBatchProceed();
  return true;
}

/** @deprecated Use saveZipBatchToDevice — kept as alias for runner trigger. */
export function requestRedownloadZipBatch(batchIndex: number): boolean {
  void saveZipBatchToDevice(batchIndex);
  return true;
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
  const full = applyBatchProgressToTask({
    ...task,
    createdAt: task.createdAt ?? now,
    updatedAt: task.updatedAt ?? now,
  });
  writeZipBackgroundTask(full);
  clearZipDownloadSessionLock();
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
