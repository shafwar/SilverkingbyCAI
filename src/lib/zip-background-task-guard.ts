import type { ZipBackgroundTask } from "@/lib/zip-background-task-store";
import { readZipBackgroundTask } from "@/lib/zip-background-task-store";
import { cancelZipBackgroundMonitoringAndReset } from "@/lib/zip-background-task-lifecycle";

export const ZIP_LEAVE_ADMIN_MESSAGE =
  "ZIP masih dibuat di server. Jika keluar dari admin, pemantauan progress di browser ini berhenti — file ZIP tetap tersimpan di server setelah selesai dan bisa diunduh lagi dari batch.\n\nYakin ingin keluar?";

export const ZIP_NAV_BLOCKED_TOAST =
  "ZIP masih diproses di server. Tunggu selesai atau batalkan pemantauan di floating card.";

export const ZIP_BEFORE_UNLOAD_HINT =
  "ZIP masih diproses di server. Progress pemantauan di browser ini akan hilang jika Anda meninggalkan halaman.";

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
