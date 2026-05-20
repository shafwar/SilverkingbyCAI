"use client";

export type ZipTaskDownload = {
  batchIndex: number;
  totalBatches: number;
  download_url: string;
  r2Key?: string;
  fileCount?: number;
  downloaded?: boolean;
  autoDownloadFailed?: boolean;
  /** Set after user was notified (toast) so we do not spam. */
  autoDownloadFailNotified?: boolean;
};

export type ZipBackgroundTask = {
  jobId: number;
  batchId: number;
  batchName: string;
  templateId: string;
  cacheKey?: string;
  status: "pending" | "processing" | "completed" | "failed";
  progressPercent: number;
  progressLabel: string;
  totalFiles?: number;
  download_url?: string;
  downloads?: ZipTaskDownload[];
  singleDownloaded?: boolean;
  singleAutoDownloadFailed?: boolean;
  singleAutoDownloadFailNotified?: boolean;
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
