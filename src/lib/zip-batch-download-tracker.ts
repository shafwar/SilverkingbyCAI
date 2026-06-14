/**
 * Browser-local tracking of which ZIP batches were downloaded (per cacheKey).
 * Does not persist across devices; cleared when admin purges ZIP cache for that key.
 */

const STORAGE_KEY = "sk_zip_batch_downloads_v1";

type ZipDownloadTrackerEntry = {
  cacheKey: string;
  downloadedBatches: number[];
  singleDownloaded?: boolean;
  updatedAt: number;
};

function readAll(): ZipDownloadTrackerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ZipDownloadTrackerEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: ZipDownloadTrackerEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

function findEntry(cacheKey: string): ZipDownloadTrackerEntry | undefined {
  return readAll().find((e) => e.cacheKey === cacheKey);
}

export function getDownloadedBatchIndices(cacheKey: string): number[] {
  if (!cacheKey) return [];
  return findEntry(cacheKey)?.downloadedBatches ?? [];
}

export function isSingleZipDownloadedInBrowser(cacheKey: string): boolean {
  if (!cacheKey) return false;
  return findEntry(cacheKey)?.singleDownloaded === true;
}

export function markBatchDownloadedInBrowser(cacheKey: string, batchIndex: number): void {
  if (!cacheKey || !Number.isFinite(batchIndex)) return;
  const all = readAll();
  const idx = all.findIndex((e) => e.cacheKey === cacheKey);
  const prev = idx >= 0 ? all[idx]! : { cacheKey, downloadedBatches: [], updatedAt: Date.now() };
  const set = new Set(prev.downloadedBatches);
  set.add(batchIndex);
  const next: ZipDownloadTrackerEntry = {
    ...prev,
    downloadedBatches: Array.from(set).sort((a, b) => a - b),
    updatedAt: Date.now(),
  };
  if (idx >= 0) all[idx] = next;
  else all.push(next);
  writeAll(all);
}

export function markSingleZipDownloadedInBrowser(cacheKey: string): void {
  if (!cacheKey) return;
  const all = readAll();
  const idx = all.findIndex((e) => e.cacheKey === cacheKey);
  const next: ZipDownloadTrackerEntry = {
    cacheKey,
    downloadedBatches: [],
    singleDownloaded: true,
    updatedAt: Date.now(),
  };
  if (idx >= 0) all[idx] = { ...all[idx]!, ...next };
  else all.push(next);
  writeAll(all);
}

export function clearZipDownloadTrackerForCacheKey(cacheKey: string): void {
  if (!cacheKey) return;
  writeAll(readAll().filter((e) => e.cacheKey !== cacheKey));
}
