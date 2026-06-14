/**
 * Client helper: record server-side download audit after successful blob save.
 */

export async function recordZipDownloadAuditClient(params: {
  cacheKey: string;
  r2Key: string;
  batchIndex?: number;
  totalBatches?: number;
}): Promise<void> {
  try {
    await fetch("/api/qr/zip-download-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {
    // non-blocking
  }
}
