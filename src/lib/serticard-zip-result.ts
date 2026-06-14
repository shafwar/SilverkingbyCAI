/**
 * Shared rules for Serticard bulk ZIP responses (API + admin UI).
 * Chunked multi-ZIP only when item count exceeds SERTICARD_ZIP_CHUNK_SIZE (100).
 */

export const SERTICARD_ZIP_CHUNK_SIZE = 100;

export type SerticardZipDownloadPart = {
  batchIndex?: number;
  totalBatches?: number;
  download_url?: string;
  downloadUrl?: string;
  r2Key?: string;
  fileCount?: number;
};

export type SerticardZipResultLike = {
  success?: boolean;
  chunked?: boolean;
  download_url?: string;
  downloadUrl?: string;
  downloads?: SerticardZipDownloadPart[];
  total_files?: number;
  fileCount?: number;
  /** Alias used by ZipBackgroundTask */
  totalFiles?: number;
};

/** True when job uses multiple ZIP batches (>100 items or totalBatches > 1). */
export function isChunkedZipResult(result: SerticardZipResultLike | null | undefined): boolean {
  if (!result) return false;
  if (result.chunked === true) return true;
  const parts = result.downloads;
  if (Array.isArray(parts) && parts.length > 0) {
    const tb = parts[0]?.totalBatches;
    if (typeof tb === "number" && tb > 1) return true;
    if (parts.length > 1) return true;
  }
  const total = result.total_files ?? result.fileCount ?? result.totalFiles;
  if (typeof total === "number" && total > SERTICARD_ZIP_CHUNK_SIZE) return true;
  return false;
}

/** Alias for isChunkedZipResult — same semantics. */
export function isMultiBatchZipResult(result: SerticardZipResultLike | null | undefined): boolean {
  return isChunkedZipResult(result);
}

export function getSingleZipDownloadUrl(
  result: SerticardZipResultLike | null | undefined
): string | null {
  if (!result || isChunkedZipResult(result)) return null;
  const direct = result.download_url || result.downloadUrl;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const one = result.downloads?.[0];
  const fromPart = one?.download_url || one?.downloadUrl;
  return typeof fromPart === "string" && fromPart.trim() ? fromPart.trim() : null;
}

/** Multi-part downloads when job is multi-batch (includes partial — only batch 1 ready). */
export function getChunkedZipDownloadParts(
  result: SerticardZipResultLike | null | undefined
): SerticardZipDownloadPart[] {
  if (!isMultiBatchZipResult(result)) return [];
  return Array.isArray(result?.downloads) ? result!.downloads! : [];
}

export type ZipBatchSavePart = {
  batchIndex: number;
  totalBatches: number;
  download_url: string;
  r2Key?: string;
  fileCount: number;
};

/** Merge API downloads[] with bundle R2 rows so save buttons always have URL + r2Key. */
export function mergeZipBatchSaveParts(
  downloads: ZipBatchSavePart[] | undefined,
  bundleBatches:
    | Array<{
        batchIndex: number;
        totalBatches: number;
        onR2?: boolean;
        downloadUrl?: string | null;
        r2Key?: string | null;
        fileCount?: number;
      }>
    | undefined,
  defaultTotalBatches?: number
): ZipBatchSavePart[] {
  const byIndex = new Map<number, ZipBatchSavePart>();
  for (const d of downloads ?? []) {
    if (d.batchIndex > 0) byIndex.set(d.batchIndex, d);
  }
  for (const b of bundleBatches ?? []) {
    if (b.onR2 === false) continue;
    const prev = byIndex.get(b.batchIndex);
    byIndex.set(b.batchIndex, {
      batchIndex: b.batchIndex,
      totalBatches: b.totalBatches ?? prev?.totalBatches ?? defaultTotalBatches ?? 1,
      download_url: prev?.download_url ?? b.downloadUrl ?? "",
      r2Key: prev?.r2Key ?? b.r2Key ?? undefined,
      fileCount: prev?.fileCount ?? b.fileCount ?? 0,
    });
  }
  return Array.from(byIndex.values()).sort((a, b) => a.batchIndex - b.batchIndex);
}

export function shouldShowMultiBatchSaveUi(
  parts: ZipBatchSavePart[],
  totalBatchesHint?: number
): boolean {
  const tb = totalBatchesHint ?? parts[0]?.totalBatches ?? 1;
  return tb > 1 || parts.length > 1;
}

export type ZipBundleBatchRow = {
  batchIndex: number;
  totalBatches?: number;
  onR2?: boolean;
  downloadUrl?: string;
  r2Key?: string;
  fileCount?: number;
};

/** Merge API downloads + bundle R2 audit rows for modal save buttons (includes partial 1/N jobs). */
export function mergeZipBatchDownloadRows(options: {
  downloads?: SerticardZipDownloadPart[];
  bundleBatches?: ZipBundleBatchRow[];
  totalBatchesHint?: number;
}): SerticardZipDownloadPart[] {
  const totalBatches =
    options.totalBatchesHint ??
    options.bundleBatches?.[0]?.totalBatches ??
    options.downloads?.[0]?.totalBatches ??
    1;
  const byIndex = new Map<number, SerticardZipDownloadPart>();

  for (const d of options.downloads ?? []) {
    const url = (d.download_url || d.downloadUrl || "").trim();
    if (url || d.r2Key?.trim()) {
      byIndex.set(d.batchIndex ?? 0, {
        ...d,
        batchIndex: d.batchIndex ?? 0,
        totalBatches: d.totalBatches ?? totalBatches,
        download_url: url || d.download_url,
      });
    }
  }

  for (const b of options.bundleBatches ?? []) {
    if (!b.onR2) continue;
    const existing = byIndex.get(b.batchIndex);
    const url = (b.downloadUrl || existing?.download_url || existing?.downloadUrl || "").trim();
    byIndex.set(b.batchIndex, {
      batchIndex: b.batchIndex,
      totalBatches: b.totalBatches ?? totalBatches,
      download_url: url,
      r2Key: b.r2Key ?? existing?.r2Key,
      fileCount: b.fileCount ?? existing?.fileCount,
    });
  }

  return [...byIndex.values()].sort((a, b) => (a.batchIndex ?? 0) - (b.batchIndex ?? 0));
}
