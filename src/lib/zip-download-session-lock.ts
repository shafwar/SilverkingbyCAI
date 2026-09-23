"use client";

const LOCK_KEY = "sk_zip_download_session_lock_v1";
const LOCK_EVENT = "sk-zip-download-session-lock-changed";

export type ZipDownloadSessionLock = {
  batchId: number;
  batchName: string;
  startedAt: number;
  kind?: "zip" | "verify" | "single-pdf" | "original-qr" | "excel";
};

function emitLockChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LOCK_EVENT));
}

export function readZipDownloadSessionLock(): ZipDownloadSessionLock | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ZipDownloadSessionLock;
    if (!parsed?.batchId || !parsed?.batchName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeZipDownloadSessionLock(lock: ZipDownloadSessionLock): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
    emitLockChange();
  } catch {
    // ignore
  }
}

export function clearZipDownloadSessionLock(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCK_KEY);
    emitLockChange();
  } catch {
    // ignore
  }
}

/** Returns false if another tab/session already holds the lock. */
export function tryAcquireZipDownloadSessionLock(lock: ZipDownloadSessionLock): boolean {
  const existing = readZipDownloadSessionLock();
  if (existing) return false;
  writeZipDownloadSessionLock(lock);
  return true;
}

export function subscribeZipDownloadSessionLock(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  const storageHandler = (e: StorageEvent) => {
    if (e.key === LOCK_KEY) onChange();
  };
  window.addEventListener(LOCK_EVENT, handler);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(LOCK_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}
