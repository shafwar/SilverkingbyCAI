/**
 * Client-side ZIP download helpers for background jobs.
 * Prefer File System Access API (save picker) when available for guaranteed file save.
 */

export type ZipDownloadAttemptResult =
  | { ok: true; method: "save-picker" | "blob"; bytes: number }
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

/** Download via same-origin API proxy (job → R2 stream). */
export async function triggerZipJobFileDownload(
  jobId: number,
  filename: string,
  options?: {
    batchIndex?: number;
    signal?: AbortSignal;
    yieldBeforeClick?: boolean;
    /** Prefer native save dialog (Chrome/Edge) for guaranteed file on disk. */
    preferSavePicker?: boolean;
  }
): Promise<ZipDownloadAttemptResult> {
  const url = withZipDownloadCacheBust(
    buildZipJobFileUrl(jobId, options?.batchIndex),
    Date.now()
  );
  return triggerSameOriginBlobDownload(url, filename, options?.signal, {
    yieldBeforeClick: options?.yieldBeforeClick ?? true,
    preferSavePicker: options?.preferSavePicker ?? true,
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

async function saveBlobWithPicker(blob: Blob, filename: string): Promise<ZipDownloadAttemptResult> {
  type SavePickerWindow = Window & {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle>;
  };
  const w = window as SavePickerWindow;
  if (typeof w.showSaveFilePicker !== "function") {
    return { ok: false, blocked: false, error: "Save picker tidak tersedia" };
  }
  try {
    const handle = await w.showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: "ZIP Archive", accept: { "application/zip": [".zip"] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { ok: true, method: "save-picker", bytes: blob.size };
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") {
      return { ok: false, blocked: false, error: "Dialog simpan dibatalkan" };
    }
    return { ok: false, blocked: false, error: err.message || "Gagal menyimpan via dialog" };
  }
}

async function saveBlobWithAnchor(
  blob: Blob,
  filename: string,
  yieldBeforeClick: boolean
): Promise<ZipDownloadAttemptResult> {
  if (yieldBeforeClick) {
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
    return { ok: true, method: "blob", bytes: blob.size };
  } catch (e) {
    URL.revokeObjectURL(objectUrl);
    throw e;
  }
}

async function triggerSameOriginBlobDownload(
  url: string,
  filename: string,
  signal?: AbortSignal,
  options?: { yieldBeforeClick?: boolean; preferSavePicker?: boolean }
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
    const contentLength = res.headers.get("content-length");
    const blob = await res.blob();
    if (!blob.size || blob.size < 64) {
      return { ok: false, blocked: false, error: "File ZIP kosong atau tidak valid" };
    }
    if (contentLength) {
      const expected = Number(contentLength);
      if (Number.isFinite(expected) && expected > 0 && blob.size < expected * 0.95) {
        return {
          ok: false,
          blocked: false,
          error: `Unduhan tidak lengkap (${blob.size} / ${expected} byte)`,
        };
      }
    }

    if (options?.preferSavePicker !== false) {
      const pickerResult = await saveBlobWithPicker(blob, filename);
      if (pickerResult.ok) return pickerResult;
      if (pickerResult.error === "Dialog simpan dibatalkan") {
        return pickerResult;
      }
    }

    return saveBlobWithAnchor(blob, filename, options?.yieldBeforeClick ?? true);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, blocked: true, error: msg };
  }
}

/**
 * Legacy direct R2 URL download — only for manual user clicks (may open tab cross-origin).
 */
export async function triggerZipFileDownload(
  url: string,
  filename: string,
  options?: { signal?: AbortSignal; preferSavePicker?: boolean }
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
    if (options?.preferSavePicker !== false) {
      const pickerResult = await saveBlobWithPicker(blob, filename);
      if (pickerResult.ok || pickerResult.error === "Dialog simpan dibatalkan") {
        return pickerResult;
      }
    }
    return saveBlobWithAnchor(blob, filename, false);
  } catch (fetchErr) {
    const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    return { ok: false, blocked: true, error: fetchMsg };
  }
}
