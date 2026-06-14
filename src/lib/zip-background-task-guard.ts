import type { ZipBackgroundTask } from "@/lib/zip-background-task-store";
import { readZipBackgroundTask } from "@/lib/zip-background-task-store";
import { cancelZipBackgroundMonitoringAndReset } from "@/lib/zip-background-task-lifecycle";
import { readZipDownloadSessionLock } from "@/lib/zip-download-session-lock";
import {
  getSingleZipDownloadUrl,
  isChunkedZipResult,
} from "@/lib/serticard-zip-result";

export const ZIP_LEAVE_ADMIN_MESSAGE =
  "ZIP masih dibuat di server. Jika keluar dari admin, pemantauan progress di browser ini berhenti — file ZIP tetap tersimpan di server setelah selesai dan bisa diunduh lagi dari batch.\n\nYakin ingin keluar?";

export const ZIP_NAV_BLOCKED_TOAST =
  "ZIP masih diproses di server. Tunggu selesai atau batalkan pemantauan di floating card.";

export const ZIP_BEFORE_UNLOAD_HINT =
  "ZIP masih diproses di server. Progress pemantauan di browser ini akan hilang jika Anda meninggalkan halaman.";

export const ZIP_DOWNLOAD_BUSY_TITLE = "Unduhan ZIP masih berjalan";

export const ZIP_DOWNLOAD_BUSY_HINT =
  "Selesaikan atau batalkan pemantauan di floating card terlebih dahulu sebelum memulai unduhan baru.";

function isTaskFullyOnDevice(t: ZipBackgroundTask): boolean {
  if (isChunkedZipResult(t) && Array.isArray(t.downloads) && t.downloads.length > 0) {
    return t.downloads.every((d) => d.downloaded || d.autoDownloadFailed);
  }
  const singleUrl = getSingleZipDownloadUrl(t);
  if (singleUrl) {
    return !!(t.singleDownloaded || t.manualDownloadRequired);
  }
  return false;
}

/** True while floating ZIP session is active (generate, poll, or auto-download to device). */
export function isZipDownloadSessionActive(task: ZipBackgroundTask | null): boolean {
  if (!task) return false;
  if (task.status === "failed") return false;
  if (task.downloadInFlight || task.singleDownloadInFlight) return true;
  if (task.status === "pending" || task.status === "processing") return true;
  if (task.status === "completed") {
    return !isTaskFullyOnDevice(task);
  }
  return false;
}

/** Cross-tab: background task or short-lived session lock (verify/compile). */
export function isAnyZipDownloadBusy(): boolean {
  return (
    isZipDownloadSessionActive(readZipBackgroundTask()) ||
    readZipDownloadSessionLock() != null
  );
}

export function getActiveZipDownloadBatchLabel(): string | null {
  const task = readZipBackgroundTask();
  if (isZipDownloadSessionActive(task) && task) {
    return task.batchName || `Batch #${task.batchId}`;
  }
  const lock = readZipDownloadSessionLock();
  if (lock) return lock.batchName || `Batch #${lock.batchId}`;
  return null;
}

/** True when href navigates outside the /admin area. */
export function hrefLeavesAdminArea(href: string): boolean {
  const raw = href.trim();
  if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
    return false;
  }
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(raw, window.location.origin);
    const path = url.pathname || "/";
    return !path.startsWith("/admin");
  } catch {
    return !raw.startsWith("/admin");
  }
}

/**
 * Block leaving admin only while server is still building the ZIP.
 * Once COMPLETED, ZIP is safe on R2 — user may navigate and re-download from batch modal.
 */
export function isZipBackgroundTaskBlocking(task: ZipBackgroundTask | null): boolean {
  if (!task) return false;
  if (task.status === "failed" || task.status === "completed") return false;
  return task.status === "pending" || task.status === "processing";
}

export function isZipBackgroundMonitoringActive(): boolean {
  return isZipBackgroundTaskBlocking(readZipBackgroundTask());
}

/** Cancel client-side ZIP monitoring (localStorage + floating UI). Server job may still finish. */
export function cancelZipBackgroundMonitoring(): void {
  cancelZipBackgroundMonitoringAndReset();
}

export function confirmLeaveAdminWhileZipActive(): boolean {
  if (!isZipBackgroundMonitoringActive()) return true;
  return window.confirm(ZIP_LEAVE_ADMIN_MESSAGE);
}
