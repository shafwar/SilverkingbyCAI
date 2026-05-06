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

function triggerBrowserDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Headless ZIP job tracker: polls `/api/qr/download-job`, updates DownloadCard via DownloadContext,
 * persists task to localStorage, auto-downloads completed batches. No second floating UI.
 */
export function ZipBackgroundRunner() {
  const { setDownloadPercent, setDownloadLabel } = useDownload();

  // Mirror task → global download card (single floating UI). Dismiss uses resetDownload in AdminLayout.
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

  // Poll job until terminal state.
  useEffect(() => {
    let cancelled = false;

    const pollOnce = async () => {
      const task = readZipBackgroundTask();
      if (!task || task.status === "completed" || task.status === "failed") return;
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
        const next: ZipBackgroundTask = {
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

  // Auto-download when job completes (once per batch URL).
  useEffect(() => {
    const run = () => {
      const task = readZipBackgroundTask();
      if (!task || task.status !== "completed") return;

      let changed = false;
      const next: ZipBackgroundTask = { ...task };

      if (Array.isArray(next.downloads) && next.downloads.length > 0) {
        next.downloads = next.downloads.map((d) => {
          if (d.downloaded) return d;
          try {
            triggerBrowserDownload(
              d.download_url,
              `${task.batchName.replace(/\s+/g, "-")}-batch-${d.batchIndex}-of-${d.totalBatches}.zip`
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
      } else if (next.download_url && !next.singleDownloaded) {
        try {
          triggerBrowserDownload(next.download_url, `${task.batchName.replace(/\s+/g, "-")}.zip`);
          next.singleDownloaded = true;
          changed = true;
        } catch {
          if (!next.singleAutoDownloadFailNotified) {
            toast.error("Unduh otomatis gagal", {
              description: "Buka halaman Batch Gram atau gunakan tombol Buka untuk mengunduh manual.",
              duration: 12_000,
              action: {
                label: "Buka",
                onClick: () => window.open(next.download_url!, "_blank", "noopener,noreferrer"),
              },
            });
          }
          next.singleAutoDownloadFailed = true;
          next.singleAutoDownloadFailNotified = true;
          changed = true;
        }
      }

      if (changed) {
        writeZipBackgroundTask(next);
      }
    };

    run();
    return subscribeZipBackgroundTask(run);
  }, []);

  return null;
}
