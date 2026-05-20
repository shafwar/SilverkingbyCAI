/** Path object R2 dari URL unduhan publik/signed. */
export function r2KeyFromDownloadUrl(downloadUrl: string): string | null {
  try {
    const u = new URL(downloadUrl);
    return u.pathname.replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
}

/** Kumpulkan semua key R2 dari hasil cache/job ZIP (multi-batch atau satu file). */
export function extractR2KeysFromZipCachedResult(result: unknown): string[] {
  if (!result || typeof result !== "object") return [];
  const r = result as Record<string, unknown>;
  const keys = new Set<string>();
  const downloads = Array.isArray(r.downloads) ? r.downloads : [];
  for (const d of downloads) {
    if (!d || typeof d !== "object") continue;
    const row = d as Record<string, unknown>;
    const direct =
      typeof row.r2Key === "string" && row.r2Key.trim() !== "" ? row.r2Key.trim() : null;
    const fromUrl =
      typeof row.download_url === "string" ? r2KeyFromDownloadUrl(row.download_url) : null;
    const k = direct ?? fromUrl;
    if (k) keys.add(k);
  }
  const single =
    (typeof r.download_url === "string" ? r.download_url : null) ??
    (typeof r.downloadUrl === "string" ? r.downloadUrl : null);
  if (single) {
    const k = r2KeyFromDownloadUrl(single);
    if (k) keys.add(k);
  }
  return Array.from(keys);
}
