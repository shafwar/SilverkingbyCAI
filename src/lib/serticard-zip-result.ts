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
};

/** True only when the server split into multiple ZIP files (>100 items). */
export function isChunkedZipResult(result: SerticardZipResultLike | null | undefined): boolean {
  if (!result) return false;
  if (result.chunked === true) return true;
  const parts = result.downloads;
  return Array.isArray(parts) && parts.length > 1;
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

/** Multi-part downloads only when chunked; never a single-element "batch" list. */
export function getChunkedZipDownloadParts(
  result: SerticardZipResultLike | null | undefined
): SerticardZipDownloadPart[] {
  if (!isChunkedZipResult(result)) return [];
  return Array.isArray(result?.downloads) ? result!.downloads! : [];
}
