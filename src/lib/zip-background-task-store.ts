"use client";

export type ZipTaskDownload = {
  batchIndex: number;
  totalBatches: number;
  download_url: string;
  r2Key?: string;
  fileCount?: number;
  /** Admin confirmed file is on device (after proceed prompt). */
  downloaded?: boolean;
  /** File sent to browser; waiting admin to confirm before marking downloaded. */
  pendingSaveConfirm?: boolean;
  autoDownloadFailed?: boolean;
  /** Set after user was notified (toast) so we do not spam. */
  autoDownloadFailNotified?: boolean;
  /** Prevents duplicate concurrent download for this batch part. */
  downloadInFlight?: boolean;
  /** Browser auto-download already triggered once for this batch. */
  autoDownloadTriggered?: boolean;
};

/** Pause after a batch save — admin must confirm before next batch downloads. */
export type ZipAwaitingProceed = {
  completedBatchIndex: number;
  nextBatchIndex: number | null;
  totalBatches: number;
  savedVia: "save-picker" | "blob";
  savedBytes: number;
  /** Tombol konfirmasi aktif setelah unduh otomatis dikirim + jeda singkat. */
  readyForConfirmAt?: number;
};

export type ZipBackgroundTask = {
  jobId: number;
  batchId: number;
  batchName: string;
  templateId: string;
  cacheKey?: string;
  status: "pending" | "processing" | "completed" | "failed";
  /** Server indicated multi-ZIP batch (>100 items). */
  chunked?: boolean;
  progressPercent: number;
  progressLabel: string;
  totalFiles?: number;
  download_url?: string;
  downloads?: ZipTaskDownload[];
  singleDownloaded?: boolean;
  /** Lock: single ZIP auto-download already in progress (prevents duplicate file save). */
  singleDownloadInFlight?: boolean;
  singleAutoDownloadFailed?: boolean;
  singleAutoDownloadFailNotified?: boolean;
  /** Auto-download exhausted — user can unduh manual dari kotak ZIP siap di modal batch. */
  manualDownloadRequired?: boolean;
  /** Prevents duplicate concurrent download attempts for the same task tick. */
  downloadInFlight?: boolean;
  /** Auto-download retry counter (transient R2 / browser blocks). */
  downloadAttempts?: number;
  /** Batch N saved — waiting admin to confirm before batch N+1. */
  awaitingProceed?: ZipAwaitingProceed;
  /** Admin chose "nanti dulu" — no further auto-download until resume. */
  downloadsPaused?: boolean;
  /** Batch index currently being saved to device (only one at a time). */
  activeDeviceBatchIndex?: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "sk_zip_background_task_v1";
const EVENT_NAME = "sk-zip-task-changed";

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeRaw(value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value == null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function readZipBackgroundTask(): ZipBackgroundTask | null {
  const raw = readRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ZipBackgroundTask;
  } catch {
    return null;
  }
}

export function writeZipBackgroundTask(task: ZipBackgroundTask): void {
  writeRaw(JSON.stringify(task));
  emitChange();
}

export function updateZipBackgroundTask(
  updater: (prev: ZipBackgroundTask | null) => ZipBackgroundTask | null
): ZipBackgroundTask | null {
  const next = updater(readZipBackgroundTask());
  if (!next) {
    clearZipBackgroundTask();
    return null;
  }
  writeZipBackgroundTask(next);
  return next;
}

export function clearZipBackgroundTask(): void {
  writeRaw(null);
  emitChange();
}

export function subscribeZipBackgroundTask(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener("storage", storageHandler);
  };
}
