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
import {
  finishAndClearZipBackgroundTask,
  ZIP_MONITORING_ABORT_EVENT,
  ZIP_BATCH_PROCEED_EVENT,
} from "@/lib/zip-background-task-lifecycle";
import { applyBatchProgressToTask } from "@/lib/zip-batch-progress";
import { triggerZipJobFileDownload } from "@/lib/zip-auto-download";
import { toast } from "sonner";
import {
  getSingleZipDownloadUrl,
  isChunkedZipResult,
  type SerticardZipResultLike,
} from "@/lib/serticard-zip-result";

const POLL_INTERVAL_MS = 1200;
const UI_DISMISS_AFTER_SUCCESS_MS = 2500;
const MAX_AUTO_DOWNLOAD_ATTEMPTS = 4;

function safeBatchFilename(batchName: string): string {
  return (batchName || "batch").replace(/\s+/g, "-");
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

  const serverMessage =
    typeof data.progressMessage === "string" && data.progressMessage.trim()
      ? data.progressMessage.trim()
      : nextStatus === "failed"
        ? data.errorMessage || "Pembuatan ZIP gagal."
        : task.progressLabel;

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
        pendingSaveConfirm: prev?.pendingSaveConfirm ?? false,
        autoDownloadFailed: prev?.autoDownloadFailed ?? false,
        autoDownloadFailNotified: prev?.autoDownloadFailNotified ?? false,
        downloadInFlight: prev?.downloadInFlight ?? false,
      };
    });
  } else if (task.downloads?.length) {
    downloads = task.downloads;
  }

  const merged: ZipBackgroundTask = {
    ...task,
    cacheKey: typeof data.cacheKey === "string" ? data.cacheKey : task.cacheKey,
    status: nextStatus,
    chunked: chunked || task.chunked,
    totalFiles: result?.total_files ?? result?.fileCount ?? task.totalFiles,
    download_url: singleUrl ?? task.download_url,
    downloads,
    lastError: nextStatus === "failed" ? data.errorMessage || "Pembuatan ZIP gagal." : task.lastError,
    updatedAt: Date.now(),
    progressPercent: task.progressPercent,
    progressLabel: task.progressLabel,
  };

  return applyBatchProgressToTask(merged, serverMessage);
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
  if (t.awaitingProceed || t.downloadsPaused) return false;
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
  if (t.awaitingProceed || t.downloadsPaused) return true;
  if (t.downloadInFlight || t.singleDownloadInFlight) return true;
  if (t.status === "pending" || t.status === "processing") return true;
  return !allZipPartsHandled(t);
}

function canStartDeviceDownload(t: ZipBackgroundTask): boolean {
  return (
    !t.awaitingProceed &&
    !t.downloadsPaused &&
    !t.downloadInFlight &&
    !t.downloads?.some((d) => d.downloadInFlight)
  );
}

/** Keep in-flight device save state when server poll refreshes partial downloads[]. */
function preserveDeviceDownloadState(
  current: ZipBackgroundTask,
  next: ZipBackgroundTask
): ZipBackgroundTask {
  const deviceBusy =
    current.downloadInFlight || current.downloads?.some((d) => d.downloadInFlight);
  if (!deviceBusy && !current.awaitingProceed) return next;

  return {
    ...next,
    downloadInFlight: current.downloadInFlight,
    activeDeviceBatchIndex: current.activeDeviceBatchIndex,
    awaitingProceed: current.awaitingProceed ?? next.awaitingProceed,
    downloadsPaused: current.downloadsPaused,
    downloads: (next.downloads ?? []).map((d) => {
      const prev = current.downloads?.find((p) => p.batchIndex === d.batchIndex);
      if (!prev) return d;
      return {
        ...d,
        downloaded: prev.downloaded,
        pendingSaveConfirm: prev.pendingSaveConfirm,
        autoDownloadFailed: prev.autoDownloadFailed,
        autoDownloadFailNotified: prev.autoDownloadFailNotified,
        downloadInFlight: prev.downloadInFlight,
      };
    }),
  };
}

function applyBatchSaveSuccessToTask(
  t: ZipBackgroundTask,
  batchIndex: number,
  savedVia: "save-picker" | "blob",
  savedBytes: number
): ZipBackgroundTask {
  const part = t.downloads?.find((d) => d.batchIndex === batchIndex);
  const totalBatches = part?.totalBatches ?? t.downloads?.[0]?.totalBatches ?? 1;
  const nextBatchIndex = batchIndex < totalBatches ? batchIndex + 1 : null;
  const downloads = (t.downloads ?? []).map((d) =>
    d.batchIndex === batchIndex
      ? { ...d, downloadInFlight: false, pendingSaveConfirm: true }
      : { ...d, downloadInFlight: false }
  );
  return applyBatchProgressToTask({
    ...t,
    downloads,
    downloadInFlight: false,
    activeDeviceBatchIndex: undefined,
    awaitingProceed: {
      completedBatchIndex: batchIndex,
      nextBatchIndex,
      totalBatches,
      savedVia,
      savedBytes,
    },
    updatedAt: Date.now(),
  });
}

async function applyAutoDownloadsForTask(
  task: ZipBackgroundTask,
  downloadSignal?: AbortSignal
): Promise<{ task: ZipBackgroundTask; changed: boolean }> {
  let t: ZipBackgroundTask = { ...task };
  let changed = false;
  const safeName = safeBatchFilename(t.batchName);

  if (!canStartDeviceDownload(t)) {
    return { task: applyBatchProgressToTask(t), changed: false };
  }

  const canAutoDownloadChunked =
    isTaskChunked(t) &&
    (t.status === "processing" || t.status === "completed") &&
    Array.isArray(t.downloads) &&
    t.downloads.length > 0;

  if (isTaskChunked(t) && Array.isArray(t.downloads) && t.downloads.length > 0 && canAutoDownloadChunked) {
    const updatedDownloads: ZipTaskDownload[] = [];
    let downloadedOneThisTick = false;

    for (const d of t.downloads) {
      if (
        d.downloaded ||
        d.pendingSaveConfirm ||
        d.autoDownloadFailed ||
        d.downloadInFlight ||
        !d.download_url?.trim()
      ) {
        updatedDownloads.push(d);
        continue;
      }
      if (downloadedOneThisTick) {
        updatedDownloads.push(d);
        continue;
      }

      const inFlightPart = { ...d, downloadInFlight: true };
      t.downloads = t.downloads.map((x) =>
        x.batchIndex === d.batchIndex ? inFlightPart : x
      );
      t.downloadInFlight = true;
      t.activeDeviceBatchIndex = d.batchIndex;
      t = applyBatchProgressToTask(
        { ...t, downloads: t.downloads, updatedAt: Date.now() },
        `Batch ${d.batchIndex}/${d.totalBatches} — mengunduh ke perangkat...`
      );
      writeZipBackgroundTask(t);

      const filename = `${safeName}-batch-${d.batchIndex}-of-${d.totalBatches}.zip`;
      const result = await triggerZipJobFileDownload(t.jobId, filename, {
        batchIndex: d.batchIndex,
        yieldBeforeClick: true,
        preferSavePicker: true,
        signal: downloadSignal,
      });

      if (result.ok) {
        changed = true;
        downloadedOneThisTick = true;
        updatedDownloads.push({
          ...d,
          downloadInFlight: false,
          pendingSaveConfirm: true,
        });
        t = applyBatchSaveSuccessToTask(t, d.batchIndex, result.method, result.bytes);
        t.downloadInFlight = false;
        toast.message(`Batch ${d.batchIndex}/${d.totalBatches} siap dikonfirmasi`, {
          description:
            result.method === "save-picker"
              ? "File disimpan via dialog. Konfirmasi di floating card untuk lanjut batch berikutnya."
              : "Periksa folder unduhan Anda, lalu konfirmasi di floating card.",
          duration: 10_000,
        });
      } else {
        changed = true;
        if (!d.autoDownloadFailNotified) {
          toast.error("Unduh batch gagal", {
            description: `Batch ${d.batchIndex}/${d.totalBatches}: ${result.error}`,
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
        t.downloadInFlight = false;
        t.activeDeviceBatchIndex = undefined;
      }
      break;
    }

    if (updatedDownloads.length < (t.downloads?.length ?? 0)) {
      for (const d of t.downloads ?? []) {
        if (!updatedDownloads.some((u) => u.batchIndex === d.batchIndex)) {
          updatedDownloads.push(d);
        }
      }
      updatedDownloads.sort((a, b) => a.batchIndex - b.batchIndex);
    }

    t.downloads = updatedDownloads;
    t.downloadInFlight = false;

    if (t.downloads.every((d) => d.downloaded)) {
      t.manualDownloadRequired = false;
      changed = true;
    } else if (t.downloads.every((d) => d.downloaded || d.autoDownloadFailed)) {
      t.manualDownloadRequired = true;
      changed = true;
    }

    t = applyBatchProgressToTask(t);
    return { task: t, changed };
  }

  if (t.status !== "completed" && !canAutoDownloadChunked) {
    return { task: applyBatchProgressToTask(t), changed: false };
  }

  if (
    t.status === "completed" &&
    !t.singleDownloaded &&
    !t.manualDownloadRequired &&
    !t.singleDownloadInFlight
  ) {
    const singleUrl = getSingleZipDownloadUrl(t);
    if (!singleUrl?.trim()) {
      return { task: applyBatchProgressToTask(t), changed: false };
    }

    const attempts = (t.downloadAttempts ?? 0) + 1;
    t.downloadAttempts = attempts;
    t.singleDownloadInFlight = true;
    t.downloadInFlight = true;
    t = applyBatchProgressToTask(t, "Mengunduh ZIP ke perangkat...");
    writeZipBackgroundTask({ ...t, updatedAt: Date.now() });

    const result = await triggerZipJobFileDownload(t.jobId, `${safeName}.zip`, {
      yieldBeforeClick: true,
      preferSavePicker: true,
      signal: downloadSignal,
    });

    t.singleDownloadInFlight = false;
    t.downloadInFlight = false;

    if (result.ok) {
      t.singleDownloaded = true;
      t.manualDownloadRequired = false;
      changed = true;
      toast.success("ZIP terunduh ke perangkat Anda");
    } else if (attempts >= MAX_AUTO_DOWNLOAD_ATTEMPTS) {
      t.manualDownloadRequired = true;
      changed = true;
      if (!t.singleAutoDownloadFailNotified) {
        toast.error("Unduh otomatis gagal", {
          description: "Buka batch Gram → kotak ZIP siap diunduh untuk unduh manual.",
          duration: 12_000,
        });
        t.singleAutoDownloadFailNotified = true;
      }
    }
  }

  t = applyBatchProgressToTask(t);
  return { task: t, changed };
}

/**
 * Headless ZIP job tracker: polls `/api/qr/download-job`, downloads batches with admin confirm between each.
 */
export function ZipBackgroundRunner() {
  const { setDownloadPercent, setDownloadLabel, resetDownload } = useDownload();
  const pollInFlightRef = useRef(false);
  const dismissTimerRef = useRef<number | null>(null);
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

        let next = preserveDeviceDownloadState(
          current,
          mapJobResultToTask(current, data)
        );
        writeZipBackgroundTask(next);

        const deviceBusy =
          next.downloadInFlight || next.downloads?.some((d) => d.downloadInFlight);

        if (!deviceBusy && canStartDeviceDownload(next)) {
          const dlAc = new AbortController();
          downloadAbortRef.current = dlAc;

          const { task: afterDl, changed: dlChanged } = await applyAutoDownloadsForTask(
            next,
            dlAc.signal
          );
          if (!readZipBackgroundTask()) return;

          next = { ...afterDl, updatedAt: Date.now() };
          writeZipBackgroundTask(next);

          if (dlChanged) {
            console.info("[ZipBackgroundRunner] Task updated", {
              jobId: next.jobId,
              label: next.progressLabel,
              progress: next.progressPercent,
            });
          }
        } else if (deviceBusy) {
          next = applyBatchProgressToTask({ ...next, updatedAt: Date.now() });
          writeZipBackgroundTask(next);
        }

        if (allZipPartsHandled(next)) {
          scheduleDismiss();
        }
      } catch (e) {
        console.warn("[ZipBackgroundRunner] Poll error:", e instanceof Error ? e.message : e);
      } finally {
        pollInFlightRef.current = false;
        const latest = readZipBackgroundTask();
        const needsQuickFollowUp =
          latest &&
          canStartDeviceDownload(latest) &&
          isTaskChunked(latest) &&
          latest.downloads?.some(
            (d) =>
              d.download_url?.trim() &&
              !d.downloaded &&
              !d.pendingSaveConfirm &&
              !d.autoDownloadFailed &&
              !d.downloadInFlight
          ) &&
          !allZipPartsHandled(latest);
        if (needsQuickFollowUp) {
          window.setTimeout(() => void pollOnce(), 350);
        }
      }
    };

    const onProceed = () => {
      void pollOnce();
    };
    window.addEventListener(ZIP_BATCH_PROCEED_EVENT, onProceed);

    const intervalId = window.setInterval(() => {
      void pollOnce();
    }, POLL_INTERVAL_MS);
    void pollOnce();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener(ZIP_BATCH_PROCEED_EVENT, onProceed);
      if (dismissTimerRef.current != null) window.clearTimeout(dismissTimerRef.current);
    };
  }, [resetDownload]);

  return null;
}
