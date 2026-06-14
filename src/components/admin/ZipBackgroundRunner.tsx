"use client";

import { useEffect, useRef } from "react";
import { useDownload } from "@/contexts/DownloadContext";
import {
  readZipBackgroundTask,
  subscribeZipBackgroundTask,
  writeZipBackgroundTask,
  type ZipBackgroundTask,
  type ZipTaskDownload,
} from "@/lib/zip-background-task-store";
import { finishAndClearZipBackgroundTask, cancelZipBackgroundMonitoringAndReset, ZIP_MONITORING_ABORT_EVENT } from "@/lib/zip-background-task-lifecycle";
import { triggerZipJobFileDownload } from "@/lib/zip-auto-download";
import {
  markBatchDownloadedInBrowser,
  markSingleZipDownloadedInBrowser,
} from "@/lib/zip-batch-download-tracker";
import { recordZipDownloadAuditClient } from "@/lib/zip-download-audit-client";
import { r2KeyFromDownloadUrl } from "@/lib/zip-r2-key";
import { toast } from "sonner";
import {
  getSingleZipDownloadUrl,
  isChunkedZipResult,
  type SerticardZipResultLike,
} from "@/lib/serticard-zip-result";

const POLL_INTERVAL_MS = 1500;
const UI_DISMISS_AFTER_SUCCESS_MS = 1200;
const MAX_AUTO_DOWNLOAD_ATTEMPTS = 4;

function safeBatchFilename(batchName: string): string {
  return (batchName || "batch").replace(/\s+/g, "-");
}

function isTaskFullyOnDevice(t: ZipBackgroundTask): boolean {
  if (isTaskChunked(t) && Array.isArray(t.downloads) && t.downloads.length > 0) {
    return t.downloads.every((d) => d.downloaded);
  }
  return !!t.singleDownloaded;
}

function mapJobResultToTask(
  task: ZipBackgroundTask,
  data: {
    status?: string;
    progressPercent?: number;
    progressMessage?: string | null;
    cacheKey?: string | null;
    errorMessage?: string | null;
    result?: SerticardZipResultLike | null;
  }
): ZipBackgroundTask {
  const result = data.result ?? null;
  const serverStatus = String(data.status || "").toUpperCase();
  const nextStatus: ZipBackgroundTask["status"] =
    serverStatus === "COMPLETED"
      ? "completed"
      : serverStatus === "FAILED"
        ? "failed"
        : serverStatus === "PROCESSING"
          ? "processing"
          : "pending";

  let progressPercent = task.progressPercent;
  if (nextStatus === "completed") {
    progressPercent = isTaskFullyOnDevice(task) ? 100 : 95;
  } else if (Number.isFinite(data.progressPercent)) {
    progressPercent = Number(data.progressPercent);
  }

  let progressLabel = task.progressLabel;
  if (nextStatus === "completed") {
    if (isTaskFullyOnDevice(task)) {
      progressLabel = isTaskChunked(task)
        ? "Selesai — semua ZIP terunduh"
        : "Selesai — ZIP terunduh";
    } else if (isTaskChunked(task)) {
      progressLabel = "Mengunduh batch ZIP ke perangkat...";
    } else {
      progressLabel = "Mengunduh ZIP ke perangkat...";
    }
  } else if (typeof data.progressMessage === "string" && data.progressMessage.trim()) {
    progressLabel = data.progressMessage.trim();
  } else if (nextStatus === "processing") {
    progressLabel = "Membuat ZIP & mengunggah ke R2...";
  } else if (nextStatus === "failed") {
    progressLabel = data.errorMessage || progressLabel || "Pembuatan ZIP gagal.";
  }

  const chunked = isChunkedZipResult(result);
  const singleUrl = getSingleZipDownloadUrl(result);

  let downloads: ZipTaskDownload[] | undefined;
  if (chunked && Array.isArray(result?.downloads)) {
    downloads = result!.downloads!.map((d) => {
      const prev = task.downloads?.find(
        (x) => x.batchIndex === d.batchIndex && x.totalBatches === d.totalBatches
      );
      const url = (d.download_url || d.downloadUrl || "").trim();
      return {
        batchIndex: d.batchIndex ?? 0,
        totalBatches: d.totalBatches ?? 0,
        download_url: url,
        r2Key: d.r2Key,
        fileCount: d.fileCount,
        downloaded: prev?.downloaded ?? false,
        autoDownloadFailed: prev?.autoDownloadFailed ?? false,
        autoDownloadFailNotified: prev?.autoDownloadFailNotified ?? false,
        downloadInFlight: prev?.downloadInFlight ?? false,
      };
    });
  }

  return {
    ...task,
    cacheKey: typeof data.cacheKey === "string" ? data.cacheKey : task.cacheKey,
    status: nextStatus,
    chunked,
    progressPercent,
    progressLabel,
    totalFiles: result?.total_files ?? result?.fileCount ?? task.totalFiles,
    download_url: singleUrl ?? task.download_url,
    downloads,
    lastError: nextStatus === "failed" ? data.errorMessage || "Pembuatan ZIP gagal." : task.lastError,
    updatedAt: Date.now(),
  };
}

function isTaskChunked(t: ZipBackgroundTask): boolean {
  return isChunkedZipResult({
    chunked: t.chunked,
    downloads: t.downloads,
    download_url: t.download_url,
  });
}

function allZipPartsHandled(t: ZipBackgroundTask): boolean {
  if (t.status === "failed") return true;
  if (t.status !== "completed") return false;

  if (isTaskChunked(t) && Array.isArray(t.downloads) && t.downloads.length > 0) {
    return t.downloads.every((d) => d.downloaded || d.autoDownloadFailed);
  }

  const singleUrl = getSingleZipDownloadUrl(t);
  if (singleUrl) {
    return !!(t.singleDownloaded || t.manualDownloadRequired);
  }

  return false;
}

function shouldContinuePolling(t: ZipBackgroundTask | null): boolean {
  if (!t?.jobId) return false;
  if (t.status === "failed") return false;
  if (t.downloadInFlight || t.singleDownloadInFlight) return true;
  return !allZipPartsHandled(t);
}

async function applyAutoDownloadsForTask(
  task: ZipBackgroundTask,
  onBeforeDownload?: () => void,
  downloadSignal?: AbortSignal
): Promise<{ task: ZipBackgroundTask; changed: boolean }> {
  const t: ZipBackgroundTask = { ...task };
  let changed = false;
  const safeName = safeBatchFilename(t.batchName);

  const canAutoDownloadChunked =
    isTaskChunked(t) &&
    (t.status === "processing" || t.status === "completed") &&
    Array.isArray(t.downloads) &&
    t.downloads.length > 0;

  if (t.status !== "completed" && !canAutoDownloadChunked) {
    return { task: t, changed: false };
  }

  if (isTaskChunked(t) && Array.isArray(t.downloads) && t.downloads.length > 0) {
    const updatedDownloads: ZipTaskDownload[] = [];
    let downloadedOneThisTick = false;

    for (const d of t.downloads) {
      if (d.downloaded || d.autoDownloadFailed || d.downloadInFlight || !d.download_url?.trim()) {
        updatedDownloads.push(d);
        continue;
      }
      if (downloadedOneThisTick) {
        updatedDownloads.push(d);
        continue;
      }

      onBeforeDownload?.();
      const inFlightPart = { ...d, downloadInFlight: true };
      t.downloads = t.downloads.map((x) =>
        x.batchIndex === d.batchIndex ? inFlightPart : x
      );
      t.downloadInFlight = true;
      writeZipBackgroundTask({ ...t, downloads: t.downloads, updatedAt: Date.now() });

      const filename = `${safeName}-batch-${d.batchIndex}-of-${d.totalBatches}.zip`;
      const result = await triggerZipJobFileDownload(t.jobId, filename, {
        batchIndex: d.batchIndex,
        yieldBeforeClick: true,
        signal: downloadSignal,
      });

      if (result.ok) {
        changed = true;
        downloadedOneThisTick = true;
        if (t.cacheKey) {
          markBatchDownloadedInBrowser(t.cacheKey, d.batchIndex);
          const rk =
            d.r2Key ||
            (d.download_url ? r2KeyFromDownloadUrl(d.download_url) : null) ||
            undefined;
          if (rk) {
            void recordZipDownloadAuditClient({
              cacheKey: t.cacheKey,
              r2Key: rk,
              batchIndex: d.batchIndex,
              totalBatches: d.totalBatches,
            });
          }
        }
        updatedDownloads.push({ ...d, downloaded: true, downloadInFlight: false });
        const doneCount = t.downloads.filter(
          (x) => x.downloaded || (x.batchIndex === d.batchIndex)
        ).length;
        t.progressLabel = `Batch ${d.batchIndex}/${d.totalBatches} terunduh (${doneCount}/${t.downloads.length})...`;
      } else {
        changed = true;
        if (!d.autoDownloadFailNotified) {
          toast.error("Unduh otomatis gagal", {
            description: `Batch ${d.batchIndex}/${d.totalBatches}: ${result.error}. Unduh manual dari kotak ZIP siap di batch.`,
            duration: 12_000,
          });
        }
        updatedDownloads.push({
          ...d,
          autoDownloadFailed: true,
          autoDownloadFailNotified: true,
          downloadInFlight: false,
        });
        t.manualDownloadRequired = true;
        t.progressLabel = `Batch ${d.batchIndex} gagal — buka batch untuk unduh manual`;
      }
      break;
    }

    if (updatedDownloads.length < t.downloads.length) {
      for (const d of t.downloads) {
        if (!updatedDownloads.some((u) => u.batchIndex === d.batchIndex)) {
          updatedDownloads.push(d);
        }
      }
      updatedDownloads.sort((a, b) => a.batchIndex - b.batchIndex);
    }

    t.downloads = updatedDownloads;
    t.downloadInFlight = false;

    if (t.downloads.every((d) => d.downloaded)) {
      t.progressPercent = 100;
      t.progressLabel = "Selesai — semua ZIP terunduh";
      t.manualDownloadRequired = false;
      changed = true;
      toast.success("Semua batch ZIP terunduh");
    } else if (t.downloads.every((d) => d.downloaded || d.autoDownloadFailed)) {
      t.manualDownloadRequired = true;
      changed = true;
    }

    return { task: t, changed };
  }

  if (
    t.status === "completed" &&
    !t.singleDownloaded &&
    !t.manualDownloadRequired &&
    !t.singleDownloadInFlight
  ) {
    const singleUrl = getSingleZipDownloadUrl(t);
    if (!singleUrl?.trim()) {
      return { task: t, changed: false };
    }

    const attempts = (t.downloadAttempts ?? 0) + 1;
    t.downloadAttempts = attempts;
    t.singleDownloadInFlight = true;
    t.downloadInFlight = true;
    writeZipBackgroundTask({ ...t, updatedAt: Date.now() });

    onBeforeDownload?.();
    const result = await triggerZipJobFileDownload(t.jobId, `${safeName}.zip`, {
      yieldBeforeClick: true,
      signal: downloadSignal,
    });

    t.singleDownloadInFlight = false;
    t.downloadInFlight = false;

    if (result.ok && result.method === "blob") {
      if (t.cacheKey) {
        markSingleZipDownloadedInBrowser(t.cacheKey);
        const rk =
          getSingleZipDownloadUrl(t) != null
            ? r2KeyFromDownloadUrl(getSingleZipDownloadUrl(t)!)
            : null;
        if (rk) {
          void recordZipDownloadAuditClient({
            cacheKey: t.cacheKey,
            r2Key: rk,
            batchIndex: 1,
            totalBatches: 1,
          });
        }
      }
      t.singleDownloaded = true;
      t.manualDownloadRequired = false;
      t.progressPercent = 100;
      t.progressLabel = "Selesai — ZIP terunduh";
      changed = true;
      toast.success("ZIP terunduh ke perangkat Anda");
    } else if (attempts >= MAX_AUTO_DOWNLOAD_ATTEMPTS) {
      t.manualDownloadRequired = true;
      t.progressPercent = 100;
      t.progressLabel = "ZIP siap di server — buka batch untuk unduh manual";
      changed = true;
      if (!t.singleAutoDownloadFailNotified) {
        toast.error("Unduh otomatis gagal", {
          description: "Buka batch Gram → kotak ZIP siap diunduh untuk unduh manual.",
          duration: 12_000,
        });
        t.singleAutoDownloadFailNotified = true;
      }
    } else {
      t.progressLabel = `Mengunduh ZIP... (${attempts}/${MAX_AUTO_DOWNLOAD_ATTEMPTS})`;
      changed = true;
    }
  }

  return { task: t, changed };
}

/**
 * Headless ZIP job tracker: polls `/api/qr/download-job`, auto-downloads when ready.
 * Floating UI is progress-only — no manual download buttons.
 */
export function ZipBackgroundRunner() {
  const { setDownloadPercent, setDownloadLabel, resetDownload, setIsDownloadMinimized } =
    useDownload();
  const pollInFlightRef = useRef(false);
  const dismissTimerRef = useRef<number | null>(null);
  const successToastShownRef = useRef(false);
  const downloadAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onAbort = () => {
      downloadAbortRef.current?.abort();
      downloadAbortRef.current = null;
      pollInFlightRef.current = false;
      if (dismissTimerRef.current != null) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
    window.addEventListener(ZIP_MONITORING_ABORT_EVENT, onAbort);
    return () => window.removeEventListener(ZIP_MONITORING_ABORT_EVENT, onAbort);
  }, []);

  useEffect(() => {
    const apply = () => {
      const task = readZipBackgroundTask();
      if (!task) {
        setDownloadPercent(null);
        setDownloadLabel("");
        successToastShownRef.current = false;
        return;
      }
      setDownloadPercent(Math.max(0, Math.min(100, Math.round(task.progressPercent))));
      setDownloadLabel(task.progressLabel || "ZIP diproses di background...");
    };
    apply();
    return subscribeZipBackgroundTask(apply);
  }, [setDownloadLabel, setDownloadPercent]);

  useEffect(() => {
    let cancelled = false;

    const scheduleDismiss = () => {
      if (dismissTimerRef.current != null) window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = window.setTimeout(() => {
        if (cancelled) return;
        const t = readZipBackgroundTask();
        if (t && allZipPartsHandled(t)) {
          finishAndClearZipBackgroundTask(resetDownload);
        }
      }, UI_DISMISS_AFTER_SUCCESS_MS);
    };

    const pollOnce = async () => {
      if (cancelled || pollInFlightRef.current) return;
      const task = readZipBackgroundTask();
      if (!shouldContinuePolling(task)) {
        if (task && allZipPartsHandled(task)) {
          scheduleDismiss();
        }
        return;
      }

      pollInFlightRef.current = true;
      try {
        let current = readZipBackgroundTask();
        if (!current) return;

        const res = await fetch(`/api/qr/download-job/${current.jobId}`, { cache: "no-store" });
        if (!res.ok) {
          console.warn("[ZipBackgroundRunner] Poll HTTP", res.status, current.jobId);
          return;
        }
        const data = await res.json();
        if (!readZipBackgroundTask()) return;

        let next = mapJobResultToTask(current, data);

        const minimizeForDownload = () => {
          setIsDownloadMinimized(true);
        };

        downloadAbortRef.current?.abort();
        const dlAc = new AbortController();
        downloadAbortRef.current = dlAc;

        const { task: afterDl, changed: dlChanged } = await applyAutoDownloadsForTask(
          next,
          minimizeForDownload,
          dlAc.signal
        );
        if (!readZipBackgroundTask()) return;

        next = { ...afterDl, updatedAt: Date.now() };
        writeZipBackgroundTask(next);

        if (dlChanged) {
          console.info("[ZipBackgroundRunner] Task updated", {
            jobId: next.jobId,
            singleDownloaded: next.singleDownloaded,
            progress: next.progressPercent,
          });
        }

        if (allZipPartsHandled(next)) {
          scheduleDismiss();
        }
      } catch (e) {
        console.warn("[ZipBackgroundRunner] Poll error:", e instanceof Error ? e.message : e);
      } finally {
        pollInFlightRef.current = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void pollOnce();
    }, POLL_INTERVAL_MS);
    void pollOnce();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      if (dismissTimerRef.current != null) window.clearTimeout(dismissTimerRef.current);
    };
  }, [resetDownload, setIsDownloadMinimized]);

  return null;
}
