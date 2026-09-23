import { r2KeyFromDownloadUrl } from "@/lib/zip-r2-key";

export type ResolvedZipJobFile = {
  r2Key: string;
  filename: string;
};

export function resolveZipFileFromJobResult(
  result: Record<string, unknown> | null | undefined,
  batchIndex?: number | null
): ResolvedZipJobFile | null {
  if (!result || typeof result !== "object") return null;

  if (batchIndex != null && Number.isFinite(batchIndex)) {
    const downloads = result.downloads;
    if (Array.isArray(downloads)) {
      const part = downloads.find(
        (d) =>
          d &&
          typeof d === "object" &&
          Number((d as { batchIndex?: number }).batchIndex) === batchIndex
      ) as Record<string, unknown> | undefined;
      if (part) {
        const r2Key =
          (typeof part.r2Key === "string" && part.r2Key.trim()) ||
          (typeof part.download_url === "string" ? r2KeyFromDownloadUrl(part.download_url) : null) ||
          (typeof part.downloadUrl === "string" ? r2KeyFromDownloadUrl(part.downloadUrl) : null);
        if (r2Key) {
          const filename =
            (typeof part.filename === "string" && part.filename.trim()) ||
            `serticard-batch-${batchIndex}.zip`;
          return { r2Key, filename };
        }
      }
    }
  }

  const r2Key =
    (typeof result.r2Key === "string" && result.r2Key.trim()) ||
    (typeof result.download_url === "string" ? r2KeyFromDownloadUrl(result.download_url) : null) ||
    (typeof result.downloadUrl === "string" ? r2KeyFromDownloadUrl(result.downloadUrl) : null);

  if (!r2Key) return null;

  const filename =
    (typeof result.filename === "string" && result.filename.trim()) || "serticard-batch.zip";
  return { r2Key, filename };
}
