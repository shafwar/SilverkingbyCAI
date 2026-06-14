/**
 * Client-side ZIP download helpers for background jobs.
 * Prefer same-origin `/api/qr/zip-file` proxy (reliable auto-download).
 */

export type ZipDownloadAttemptResult =
  | { ok: true; method: "blob" }
  | { ok: false; blocked: boolean; error: string };

export function buildZipJobFileUrl(jobId: number, batchIndex?: number): string {
  const params = new URLSearchParams({ jobId: String(jobId) });
  if (batchIndex != null && Number.isFinite(batchIndex) && batchIndex > 0) {
    params.set("batchIndex", String(batchIndex));
  }
  return `/api/qr/zip-file?${params.toString()}`;
}

export function withZipDownloadCacheBust(url: string, bustMs: number): string {
  if (!url?.trim() || typeof bustMs !== "number" || !Number.isFinite(bustMs)) return url;
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : undefined);
    u.searchParams.set("_skcb", String(Math.floor(bustMs)));
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}_skcb=${encodeURIComponent(String(Math.floor(bustMs)))}`;
  }
}

/** Download via same-origin API proxy (job → R2 stream). Works without user gesture. */
export async function triggerZipJobFileDownload(
  jobId: number,
  filename: string,
  options?: { batchIndex?: number; signal?: AbortSignal; yieldBeforeClick?: boolean }
): Promise<ZipDownloadAttemptResult> {
  const url = withZipDownloadCacheBust(
    buildZipJobFileUrl(jobId, options?.batchIndex),
    Date.now()
  );
  return triggerSameOriginBlobDownload(url, filename, options?.signal, {
    yieldBeforeClick: options?.yieldBeforeClick ?? true,
  });
}

/** Yield so fullscreen overlays can unmount before programmatic save dialog. */
export function yieldForDownloadUi(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

async function triggerSameOriginBlobDownload(
  url: string,
  filename: string,
  signal?: AbortSignal,
  options?: { yieldBeforeClick?: boolean }
): Promise<ZipDownloadAttemptResult> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j?.error) detail = String(j.error);
      } catch {
        // ignore
      }
      return { ok: false, blocked: false, error: detail };
    }
    const blob = await res.blob();
    if (!blob.size || blob.size < 64) {
      return { ok: false, blocked: false, error: "File ZIP kosong atau tidak valid" };
    }
    if (options?.yieldBeforeClick) {
      await yieldForDownloadUi();
    }
    const objectUrl = URL.createObjectURL(blob);
    try {
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.style.display = "none";
      link.setAttribute("rel", "noopener");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
      return { ok: true, method: "blob" };
    } catch (e) {
      URL.revokeObjectURL(objectUrl);
      throw e;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, blocked: true, error: msg };
  }
}

/**
 * Legacy direct R2 URL download — only for manual user clicks (may open tab cross-origin).
 * Do NOT treat success as confirmed file save for background auto-download.
 */
export async function triggerZipFileDownload(
  url: string,
  filename: string,
  options?: { signal?: AbortSignal }
): Promise<ZipDownloadAttemptResult> {
  const busted = withZipDownloadCacheBust(url, Date.now());
  try {
    const res = await fetch(busted, { cache: "no-store", mode: "cors", signal: options?.signal });
    if (!res.ok) {
      return { ok: false, blocked: false, error: `Unduh gagal (HTTP ${res.status})` };
    }
    const blob = await res.blob();
    if (!blob.size) {
      return { ok: false, blocked: false, error: "File ZIP kosong" };
    }
    const objectUrl = URL.createObjectURL(blob);
    try {
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
      return { ok: true, method: "blob" };
    } catch (e) {
      URL.revokeObjectURL(objectUrl);
      throw e;
    }
  } catch (fetchErr) {
    const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    return { ok: false, blocked: true, error: fetchMsg };
  }
}
