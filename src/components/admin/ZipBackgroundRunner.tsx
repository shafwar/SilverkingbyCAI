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
import { saveZipBatchPartToDevice } from "@/lib/zip-auto-download";
import { toast } from "sonner";
import {
  getSingleZipDownloadUrl,
  isChunkedZipResult,
  type SerticardZipResultLike,
} from "@/lib/serticard-zip-result";

const POLL_INTERVAL_MS = 1500;
const UI_DISMISS_AFTER_SUCCESS_MS = 2500;
const MAX_AUTO_DOWNLOAD_ATTEMPTS = 4;

function safeBatchFilename(batchName: string): string {
  return (batchName || "batch").replace(/\s+/g, "-");
}

function isAbortError(message: string): boolean {
  return /abort/i.test(message);
}

function isTaskChunked(t: ZipBackgroundTask): boolean {
  if (t.chunked === true) return true;
  const tb = t.downloads?.[0]?.totalBatches ?? 0;
  if (tb > 1) return true;
  return isChunkedZipResult({
    chunked: t.chunked,
    downloads: t.downloads,
    download_url: t.download_url,
    total_files: t.totalFiles,
  });
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

  const chunkedFromResult = isChunkedZipResult(result);
  const singleUrl = getSingleZipDownloadUrl(result);

  let downloads: ZipTaskDownload[] | undefined;
  if (Array.isArray(result?.downloads) && result!.downloads!.length > 0) {
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

  const totalBatchesHint = downloads?.[0]?.totalBatches ?? 0;

  const merged: ZipBackgroundTask = {
    ...task,
    cacheKey: typeof data.cacheKey === "string" ? data.cacheKey : task.cacheKey,
    status: nextStatus,
    chunked: chunkedFromResult || task.chunked || totalBatchesHint > 1,
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
  return true;
}

function canStartDeviceDownload(t: ZipBackgroundTask): boolean {
  if (t.awaitingProceed || t.downloadsPaused) return false;
  if (t.downloadInFlight || t.singleDownloadInFlight) return false;
  if (t.downloads?.some((d) => d.downloadInFlight)) return false;
  return true;
}

function nextBatchToSave(t: ZipBackgroundTask): ZipTaskDownload | undefined {
  if (!Array.isArray(t.downloads)) return undefined;
  const sorted = [...t.downloads].sort((a, b) => a.batchIndex - b.batchIndex);
  for (const d of sorted) {
    const hasSource = !!(d.download_url?.trim() || d.r2Key?.trim());
    if (!hasSource) return undefined;
    if (d.downloaded || d.pendingSaveConfirm || d.downloadInFlight || d.autoDownloadFailed) {
      continue;
    }
    const priorIncomplete = sorted.some(
      (p) =>
        p.batchIndex < d.batchIndex &&
        (p.download_url?.trim() || p.r2Key?.trim()) &&
        !p.downloaded &&
        !p.pendingSaveConfirm
    );
    if (priorIncomplete) return undefined;
    return d;
  }
  return undefined;
}

function preserveDeviceDownloadState(
  current: ZipBackgroundTask,
  next: ZipBackgroundTask
): ZipBackgroundTask {
  const deviceBusy =
    current.downloadInFlight ||
    current.downloads?.some((d) => d.downloadInFlight) ||
    current.awaitingProceed;
  if (!deviceBusy) return next;

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

async function saveOneBatchToDevice(t: ZipBackgroundTask, d: ZipTaskDownload): Promise<ZipBackgroundTask> {
  const safeName = safeBatchFilename(t.batchName);
  const filename = `${safeName}-batch-${d.batchIndex}-of-${d.totalBatches}.zip`;

  let next = applyBatchProgressToTask(
    {
      ...t,
      downloadInFlight: true,
      activeDeviceBatchIndex: d.batchIndex,
      downloads: (t.downloads ?? []).map((x) =>
        x.batchIndex === d.batchIndex ? { ...x, downloadInFlight: true } : x
      ),
      updatedAt: Date.now(),
    },
    `Batch ${d.batchIndex}/${d.totalBatches} — menyimpan ke laptop...`
  );
  writeZipBackgroundTask(next);

  const result = await saveZipBatchPartToDevice({
    filename,
    jobId: t.jobId,
    batchIndex: d.batchIndex,
    r2Key: d.r2Key,
    download_url: d.download_url,
    preferSavePicker: false,
  });

  if (result.ok) {
    next = applyBatchSaveSuccessToTask(next, d.batchIndex, result.method, result.bytes);
    writeZipBackgroundTask(next);
    toast.message(`Batch ${d.batchIndex}/${d.totalBatches} — simpan ke laptop`, {
      description:
        result.method === "save-picker"
          ? "File disimpan. Konfirmasi di floating card untuk lanjut batch berikutnya."
          : "Cek folder unduhan, lalu konfirmasi di floating card.",
      duration: 12_000,
    });
    return next;
  }

  if (isAbortError(result.error)) {
    next = applyBatchProgressToTask({
      ...next,
      downloadInFlight: false,
      activeDeviceBatchIndex: undefined,
      downloads: (next.downloads ?? []).map((x) => ({ ...x, downloadInFlight: false })),
      updatedAt: Date.now(),
    });
    writeZipBackgroundTask(next);
    return next;
  }

  if (!d.autoDownloadFailNotified) {
    toast.error("Gagal simpan batch ke laptop", {
      description: `Batch ${d.batchIndex}/${d.totalBatches}: ${result.error}`,
      duration: 14_000,
    });
  }

  next = applyBatchProgressToTask({
    ...next,
    downloadInFlight: false,
    activeDeviceBatchIndex: undefined,
    manualDownloadRequired: true,
    downloads: (next.downloads ?? []).map((x) =>
      x.batchIndex === d.batchIndex
        ? {
            ...x,
            downloadInFlight: false,
            autoDownloadFailed: false,
            autoDownloadFailNotified: true,
          }
        : { ...x, downloadInFlight: false }
    ),
    updatedAt: Date.now(),
  });
  writeZipBackgroundTask(next);
  return next;
}

async function runDeviceDownloadPass(): Promise<boolean> {
  const task = readZipBackgroundTask();
  if (!task || !canStartDeviceDownload(task)) return false;

  const canChunked =
    isTaskChunked(task) &&
    (task.status === "processing" || task.status === "completed") &&
    Array.isArray(task.downloads) &&
    task.downloads.length > 0;

  if (canChunked) {
    const d = nextBatchToSave(task);
    if (!d) return false;
    await saveOneBatchToDevice(task, d);
    return true;
  }

  if (
    task.status === "completed" &&
    !task.singleDownloaded &&
    !task.manualDownloadRequired &&
    !task.singleDownloadInFlight
  ) {
    const singleUrl = getSingleZipDownloadUrl(task);
    if (!singleUrl?.trim()) return false;
    const attempts = (task.downloadAttempts ?? 0) + 1;
    const safeName = safeBatchFilename(task.batchName);
    let t: ZipBackgroundTask = {
      ...task,
      downloadAttempts: attempts,
      singleDownloadInFlight: true,
      downloadInFlight: true,
    };
    writeZipBackgroundTask(applyBatchProgressToTask(t, "Mengunduh ZIP ke perangkat..."));

    const result = await saveZipBatchPartToDevice({
      filename: `${safeName}.zip`,
      jobId: task.jobId,
      download_url: singleUrl,
      preferSavePicker: false,
    });

    t = readZipBackgroundTask() ?? task;
    t.singleDownloadInFlight = false;
    t.downloadInFlight = false;
    if (result.ok) {
      t.singleDownloaded = true;
      t.manualDownloadRequired = false;
      writeZipBackgroundTask(applyBatchProgressToTask(t));
      toast.success("ZIP terunduh ke perangkat Anda");
      return true;
    }
    if (attempts >= MAX_AUTO_DOWNLOAD_ATTEMPTS) {
      t.manualDownloadRequired = true;
      writeZipBackgroundTask(applyBatchProgressToTask(t));
    }
  }

  return false;
}

/**
 * Headless ZIP job tracker: poll server + auto-save each batch to laptop when R2-ready.
 */
export function ZipBackgroundRunner() {
  const { setDownloadPercent, setDownloadLabel, resetDownload } = useDownload();
  const pollInFlightRef = useRef(false);
  const downloadInFlightRef = useRef(false);
  const dismissTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onAbort = () => {
      pollInFlightRef.current = false;
      downloadInFlightRef.current = false;
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

    const triggerDownload = () => {
      if (cancelled || downloadInFlightRef.current) return;
      const task = readZipBackgroundTask();
      if (!task || !canStartDeviceDownload(task)) return;
      if (!nextBatchToSave(task) && !getSingleZipDownloadUrl(task)) return;

      downloadInFlightRef.current = true;
      void runDeviceDownloadPass()
        .catch((e) => {
          console.warn("[ZipBackgroundRunner] Download error:", e instanceof Error ? e.message : e);
        })
        .finally(() => {
          downloadInFlightRef.current = false;
          if (!cancelled && canStartDeviceDownload(readZipBackgroundTask() ?? ({} as ZipBackgroundTask))) {
            window.setTimeout(triggerDownload, 400);
          }
        });
    };

    const pollOnce = async () => {
      if (cancelled || pollInFlightRef.current) return;
      const task = readZipBackgroundTask();
      if (!shouldContinuePolling(task)) {
        if (task && allZipPartsHandled(task)) scheduleDismiss();
        return;
      }

      pollInFlightRef.current = true;
      try {
        const current = readZipBackgroundTask();
        if (!current) return;

        const res = await fetch(`/api/qr/download-job/${current.jobId}`, { cache: "no-store" });
        if (!res.ok) {
          console.warn("[ZipBackgroundRunner] Poll HTTP", res.status, current.jobId);
          return;
        }
        const data = await res.json();
        if (!readZipBackgroundTask()) return;

        const next = preserveDeviceDownloadState(
          current,
          mapJobResultToTask(current, data)
        );
        writeZipBackgroundTask(next);

        if (allZipPartsHandled(next)) {
          scheduleDismiss();
        } else if (canStartDeviceDownload(next) && nextBatchToSave(next)) {
          triggerDownload();
        }
      } catch (e) {
        console.warn("[ZipBackgroundRunner] Poll error:", e instanceof Error ? e.message : e);
      } finally {
        pollInFlightRef.current = false;
      }
    };

    const onProceed = () => {
      triggerDownload();
      void pollOnce();
    };
    window.addEventListener(ZIP_BATCH_PROCEED_EVENT, onProceed);

    const unsub = subscribeZipBackgroundTask(() => {
      triggerDownload();
    });

    const intervalId = window.setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
    void pollOnce();
    triggerDownload();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener(ZIP_BATCH_PROCEED_EVENT, onProceed);
      unsub();
      if (dismissTimerRef.current != null) window.clearTimeout(dismissTimerRef.current);
    };
  }, [resetDownload]);

  return null;
}
