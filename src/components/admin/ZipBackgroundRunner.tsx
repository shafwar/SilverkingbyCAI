"use client";

import { useEffect } from "react";
import { useDownload } from "@/contexts/DownloadContext";
import {
  readZipBackgroundTask,
  subscribeZipBackgroundTask,
  writeZipBackgroundTask,
  type ZipBackgroundTask,
} from "@/lib/zip-background-task-store";
import { toast } from "sonner";

function withZipDownloadCacheBust(url: string, bustMs: number): string {
  if (!url || typeof bustMs !== "number" || !Number.isFinite(bustMs)) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("_skcb", String(Math.floor(bustMs)));
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}_skcb=${encodeURIComponent(String(Math.floor(bustMs)))}`;
  }
}

function triggerBrowserDownload(url: string, filename: string) {
  const busted = withZipDownloadCacheBust(url, Date.now());
  const link = document.createElement("a");
  link.href = busted;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Chunked jobs expose new `downloads[]` rows while status is still PROCESSING — auto-save each ZIP as soon as its URL appears. */
function applyAutoDownloadsForTask(task: ZipBackgroundTask): { task: ZipBackgroundTask; changed: boolean } {
  const t: ZipBackgroundTask = { ...task };
  let changed = false;
  const safeName = (t.batchName || "batch").replace(/\s+/g, "-");

  if (Array.isArray(t.downloads) && t.downloads.length > 0) {
    t.downloads = t.downloads.map((d) => {
      if (d.downloaded || d.autoDownloadFailed || !d.download_url?.trim()) return d;
      try {
        triggerBrowserDownload(
          d.download_url,
          `${safeName}-batch-${d.batchIndex}-of-${d.totalBatches}.zip`
        );
        changed = true;
        return { ...d, downloaded: true };
      } catch {
        changed = true;
        if (!d.autoDownloadFailNotified) {
          toast.error("Unduh otomatis gagal", {
            description: `Buka link manual: batch ${d.batchIndex}/${d.totalBatches}`,
            duration: 12_000,
            action: {
              label: "Buka",
              onClick: () => window.open(d.download_url, "_blank", "noopener,noreferrer"),
            },
          });
        }
        return { ...d, autoDownloadFailed: true, autoDownloadFailNotified: true };
      }
    });
  } else if (
    t.status === "completed" &&
    t.download_url &&
    !t.singleDownloaded &&
    (!t.downloads || t.downloads.length === 0)
  ) {
    try {
      triggerBrowserDownload(t.download_url, `${safeName}.zip`);
      t.singleDownloaded = true;
      changed = true;
    } catch {
      if (!t.singleAutoDownloadFailNotified) {
        toast.error("Unduh otomatis gagal", {
          description: "Buka halaman Batch Gram atau gunakan tombol Buka untuk mengunduh manual.",
          duration: 12_000,
          action: {
            label: "Buka",
            onClick: () => window.open(t.download_url!, "_blank", "noopener,noreferrer"),
          },
        });
      }
      t.singleAutoDownloadFailed = true;
      t.singleAutoDownloadFailNotified = true;
      changed = true;
    }
  }

  return { task: t, changed };
}

function allZipPartsHandled(t: ZipBackgroundTask): boolean {
  if (Array.isArray(t.downloads) && t.downloads.length > 0) {
    return t.downloads.every((d) => d.downloaded || d.autoDownloadFailed);
  }
  if (t.download_url) {
    return !!(t.singleDownloaded || t.singleAutoDownloadFailed);
  }
  return true;
}

function shouldStopPolling(t: ZipBackgroundTask | null): boolean {
  if (!t) return true;
  if (t.status === "failed") return true;
  if (t.status === "completed" && allZipPartsHandled(t)) return true;
  return false;
}

/**
 * Headless ZIP job tracker: polls `/api/qr/download-job`, updates DownloadCard via DownloadContext,
 * persists task to localStorage, auto-downloads each chunked ZIP as soon as its batch URL is available.
 */
export function ZipBackgroundRunner() {
  const { setDownloadPercent, setDownloadLabel } = useDownload();

  useEffect(() => {
    const apply = () => {
      const task = readZipBackgroundTask();
      if (!task) return;
      setDownloadPercent(Math.max(0, Math.min(100, Math.round(task.progressPercent))));
      setDownloadLabel(task.progressLabel || "ZIP diproses di background...");
    };
    apply();
    return subscribeZipBackgroundTask(apply);
  }, [setDownloadLabel, setDownloadPercent]);

  useEffect(() => {
    let cancelled = false;

    const pollOnce = async () => {
      const task = readZipBackgroundTask();
      if (!task || shouldStopPolling(task)) return;
      try {
        const res = await fetch(`/api/qr/download-job/${task.jobId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const progressPercent = Number.isFinite(data.progressPercent)
          ? Number(data.progressPercent)
          : task.progressPercent;
        let progressLabel =
          typeof data.progressMessage === "string" && data.progressMessage.trim()
            ? data.progressMessage
            : data.status === "PROCESSING"
              ? "Membuat ZIP & mengunggah ke R2..."
              : "ZIP diproses di background...";
        if (data.status === "FAILED") {
          progressLabel = data.errorMessage || progressLabel || "Pembuatan ZIP gagal.";
        }
        const nextStatus =
          data.status === "COMPLETED"
            ? "completed"
            : data.status === "FAILED"
              ? "failed"
              : data.status === "PROCESSING"
                ? "processing"
                : "pending";
        let next: ZipBackgroundTask = {
          ...task,
          cacheKey: typeof data.cacheKey === "string" ? data.cacheKey : task.cacheKey,
          status: nextStatus,
          progressPercent,
          progressLabel,
          totalFiles: data.result?.total_files ?? data.result?.fileCount ?? task.totalFiles,
          download_url: data.result?.download_url ?? data.result?.downloadUrl ?? task.download_url,
          downloads: Array.isArray(data.result?.downloads)
            ? data.result.downloads.map((d: any) => {
                const prev = task.downloads?.find(
                  (x) => x.batchIndex === d.batchIndex && x.totalBatches === d.totalBatches
                );
                return {
                  batchIndex: d.batchIndex,
                  totalBatches: d.totalBatches,
                  download_url: d.download_url,
                  r2Key: d.r2Key,
                  fileCount: d.fileCount,
                  downloaded: prev?.downloaded ?? false,
                  autoDownloadFailed: prev?.autoDownloadFailed ?? false,
                  autoDownloadFailNotified: prev?.autoDownloadFailNotified ?? false,
                };
              })
            : task.downloads,
          lastError:
            data.status === "FAILED" ? data.errorMessage || "Pembuatan ZIP gagal." : task.lastError,
          updatedAt: Date.now(),
        };

        const { task: afterDl, changed: dlChanged } = applyAutoDownloadsForTask(next);
        next = afterDl;
        if (dlChanged) {
          next.updatedAt = Date.now();
        }
        writeZipBackgroundTask(next);
      } catch {
        // transient network; next tick retries
      }
    };

    const intervalId = window.setInterval(() => {
      if (cancelled) return;
      void pollOnce();
    }, 2500);
    void pollOnce();
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
