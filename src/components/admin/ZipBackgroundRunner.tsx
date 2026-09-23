"use client";

import { useEffect, useRef } from "react";
import { useDownload } from "@/contexts/DownloadContext";
import {
  readZipBackgroundTask,
  subscribeZipBackgroundTask,
  updateZipBackgroundTask,
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
import { saveZipBatchPartToDevice, type ZipDownloadAttemptResult } from "@/lib/zip-auto-download";
import { r2KeyFromDownloadUrl } from "@/lib/zip-r2-key";
import { toast } from "sonner";
import {
  getSingleZipDownloadUrl,
  isChunkedZipResult,
  type SerticardZipResultLike,
} from "@/lib/serticard-zip-result";

const POLL_INTERVAL_MS = 1500;
const UI_DISMISS_AFTER_SUCCESS_MS = 2500;
const MAX_AUTO_DOWNLOAD_ATTEMPTS = 4;
/** Jeda setelah trigger unduh browser sebelum tampilkan konfirmasi admin. */
const DEVICE_AUTO_WAIT_MS = 3500;
/** Tombol konfirmasi aktif setelah unduh otomatis dikirim. */
const DEVICE_CONFIRM_BUTTON_DELAY_MS = 2000;
/** Jika klaim unduh macet tanpa file terkirim, reset dan coba lagi. */
const AUTO_DOWNLOAD_CLAIM_STUCK_MS = 20_000;
/** Jika state downloadInFlight macet lebih lama, paksa ke konfirmasi. */
const DEVICE_SAVE_STUCK_MS = 45_000;
/** Tunggu UI menampilkan 100% sukses R2 sebelum mulai simpan ke laptop. */
const SERVER_SUCCESS_BEFORE_DEVICE_MS = 800;

/** Tab-local guard — cegah double trigger sebelum localStorage sync. */
const triggeredBatchKeys = new Set<string>();

function batchTriggerKey(task: ZipBackgroundTask, batchIndex: number): string {
  return `${task.jobId}:${batchIndex}`;
}

function isBatchAutoTriggered(task: ZipBackgroundTask, batchIndex: number): boolean {
  if (triggeredBatchKeys.has(batchTriggerKey(task, batchIndex))) return true;
  return !!task.downloads?.find((d) => d.batchIndex === batchIndex)?.autoDownloadTriggered;
}

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
      const r2Key =
        d.r2Key?.trim() ||
        prev?.r2Key ||
        (url ? r2KeyFromDownloadUrl(url) ?? undefined : undefined);
      return {
        batchIndex: d.batchIndex ?? 0,
        totalBatches: d.totalBatches ?? 0,
        download_url: url,
        r2Key,
        fileCount: d.fileCount,
        downloaded: prev?.downloaded ?? false,
        pendingSaveConfirm: prev?.pendingSaveConfirm ?? false,
        autoDownloadFailed: prev?.autoDownloadFailed ?? false,
        autoDownloadFailNotified: prev?.autoDownloadFailNotified ?? false,
        downloadInFlight: prev?.downloadInFlight ?? false,
        autoDownloadTriggered: prev?.autoDownloadTriggered ?? false,
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

function findBatchDownloadPart(
  t: ZipBackgroundTask,
  batchIndex: number
): ZipTaskDownload | undefined {
  const d = t.downloads?.find((x) => x.batchIndex === batchIndex);
  if (!d) return undefined;
  if (!(d.download_url?.trim() || d.r2Key?.trim())) return undefined;
  if (d.downloaded || d.pendingSaveConfirm || d.autoDownloadFailed) return undefined;
  return d;
}

/** Reset klaim unduh yatim dari deploy lama — langsung, tanpa tunggu. */
function healOrphanAutoDownloadClaim(task: ZipBackgroundTask): ZipBackgroundTask {
  if (task.awaitingProceed || task.downloadInFlight || task.singleDownloadInFlight) return task;
  if (task.downloads?.some((d) => d.downloadInFlight)) return task;

  const orphan = task.downloads?.find(
    (d) =>
      d.autoDownloadTriggered &&
      !d.pendingSaveConfirm &&
      !d.downloaded &&
      !d.downloadInFlight
  );
  if (!orphan) return task;

  triggeredBatchKeys.delete(batchTriggerKey(task, orphan.batchIndex));
  return applyBatchProgressToTask(
    {
      ...task,
      downloads: (task.downloads ?? []).map((d) =>
        d.batchIndex === orphan.batchIndex ? { ...d, autoDownloadTriggered: false } : d
      ),
      updatedAt: Date.now(),
    },
    `Batch ${orphan.batchIndex}/${orphan.totalBatches} — siap unduh otomatis ke laptop...`
  );
}

/** Reset batch yang diklaim tapi unduh browser tidak pernah selesai (sudah lama). */
function healStuckAutoDownloadClaim(task: ZipBackgroundTask): ZipBackgroundTask {
  const stuckPart = task.downloads?.find(
    (d) =>
      d.autoDownloadTriggered &&
      !d.pendingSaveConfirm &&
      !d.downloaded &&
      !d.downloadInFlight &&
      !task.awaitingProceed
  );
  if (!stuckPart) return task;
  if (Date.now() - task.updatedAt < AUTO_DOWNLOAD_CLAIM_STUCK_MS) return task;

  triggeredBatchKeys.delete(batchTriggerKey(task, stuckPart.batchIndex));
  return applyBatchProgressToTask(
    {
      ...task,
      downloadInFlight: false,
      activeDeviceBatchIndex: undefined,
      downloads: (task.downloads ?? []).map((d) =>
        d.batchIndex === stuckPart.batchIndex
          ? { ...d, autoDownloadTriggered: false, downloadInFlight: false }
          : d
      ),
      updatedAt: Date.now(),
    },
    `Batch ${stuckPart.batchIndex}/${stuckPart.totalBatches} — siap unduh otomatis ke laptop...`
  );
}

function healStuckDeviceDownload(task: ZipBackgroundTask): ZipBackgroundTask {
  if (task.awaitingProceed) return task;
  const inFlightIdx =
    task.activeDeviceBatchIndex ??
    task.downloads?.find((d) => d.downloadInFlight)?.batchIndex;
  const stuck =
    task.downloadInFlight ||
    (inFlightIdx != null && task.downloads?.some((d) => d.downloadInFlight));
  if (!stuck || !inFlightIdx) return task;
  if (Date.now() - task.updatedAt < DEVICE_SAVE_STUCK_MS) return task;

  const cleared = {
    ...task,
    downloadInFlight: false,
    activeDeviceBatchIndex: undefined,
    downloads: (task.downloads ?? []).map((d) => ({ ...d, downloadInFlight: false })),
    updatedAt: Date.now(),
  };
  return applyBatchSaveSuccessToTask(cleared, inFlightIdx, "blob", 0);
}

function mergePollWithLocalState(
  local: ZipBackgroundTask,
  fromServer: ZipBackgroundTask,
  serverMessage?: string | null
): ZipBackgroundTask {
  const byIndex = new Map<number, ZipTaskDownload>();

  for (const d of fromServer.downloads ?? []) {
    byIndex.set(d.batchIndex, d);
  }
  for (const prev of local.downloads ?? []) {
    const fromPoll = byIndex.get(prev.batchIndex);
    if (fromPoll) {
      byIndex.set(prev.batchIndex, {
        ...fromPoll,
        downloaded: prev.downloaded ?? false,
        pendingSaveConfirm: prev.downloaded ? false : (prev.pendingSaveConfirm ?? false),
        downloadInFlight: prev.downloadInFlight ?? false,
        autoDownloadFailed: prev.autoDownloadFailed ?? false,
        autoDownloadFailNotified: prev.autoDownloadFailNotified ?? false,
        autoDownloadTriggered: prev.autoDownloadTriggered ?? false,
      });
    } else if (prev.downloaded || prev.pendingSaveConfirm) {
      byIndex.set(prev.batchIndex, prev);
    }
  }

  const downloads = [...byIndex.values()].sort((a, b) => a.batchIndex - b.batchIndex);

  const inFlight =
    local.downloadInFlight ||
    local.downloads?.some((d) => d.downloadInFlight) ||
    local.singleDownloadInFlight;

  const awaitingProceed = (() => {
    const ap = local.awaitingProceed;
    if (!ap) return undefined;
    const completed = local.downloads?.find((d) => d.batchIndex === ap.completedBatchIndex);
    if (completed?.downloaded) return undefined;
    return ap;
  })();

  return applyBatchProgressToTask(
    {
      ...fromServer,
      downloads: downloads.length > 0 ? downloads : local.downloads,
      awaitingProceed,
      downloadsPaused: awaitingProceed ? local.downloadsPaused : false,
      downloadInFlight: inFlight ? local.downloadInFlight : fromServer.downloadInFlight,
      activeDeviceBatchIndex: inFlight ? local.activeDeviceBatchIndex : fromServer.activeDeviceBatchIndex,
      singleDownloadInFlight: inFlight ? local.singleDownloadInFlight : fromServer.singleDownloadInFlight,
    },
    serverMessage ?? fromServer.progressLabel
  );
}

function applyBatchSaveSuccessToTask(
  t: ZipBackgroundTask,
  batchIndex: number,
  savedVia: "save-picker" | "blob",
  savedBytes: number
): ZipBackgroundTask {
  const part = t.downloads?.find((d) => d.batchIndex === batchIndex);
  if (part?.downloaded) return t;
  const totalBatches = part?.totalBatches ?? t.downloads?.[0]?.totalBatches ?? 1;
  const nextBatchIndex = batchIndex < totalBatches ? batchIndex + 1 : null;
  const now = Date.now();
  const downloads = (t.downloads ?? []).map((d) =>
    d.batchIndex === batchIndex
      ? { ...d, downloadInFlight: false, pendingSaveConfirm: true, autoDownloadTriggered: true }
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
      readyForConfirmAt: now + DEVICE_CONFIRM_BUTTON_DELAY_MS,
    },
    updatedAt: now,
  });
}

function claimBatchForAutoDownload(task: ZipBackgroundTask, batchIndex: number): boolean {
  const key = batchTriggerKey(task, batchIndex);
  if (triggeredBatchKeys.has(key)) return false;

  let claimed = false;
  updateZipBackgroundTask((t) => {
    if (!t || !canStartDeviceDownload(t)) return t;
    const target = nextBatchToSave(t);
    if (!target || target.batchIndex !== batchIndex) return t;
    claimed = true;
    triggeredBatchKeys.add(key);
    return applyBatchProgressToTask(
      {
        ...t,
        updatedAt: Date.now(),
      },
      `Batch ${batchIndex}/${target.totalBatches} — 100%. Tunggu sebentar, file akan masuk secara otomatis...`
    );
  });
  return claimed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function saveOneBatchToDevice(t: ZipBackgroundTask, d: ZipTaskDownload): Promise<ZipBackgroundTask> {
  const freshBefore = readZipBackgroundTask();
  const existing = freshBefore?.downloads?.find((x) => x.batchIndex === d.batchIndex);
  if (
    existing?.downloaded ||
    freshBefore?.awaitingProceed?.completedBatchIndex === d.batchIndex ||
    existing?.pendingSaveConfirm
  ) {
    return freshBefore ?? t;
  }

  const safeName = safeBatchFilename(t.batchName);
  const filename = `${safeName}-batch-${d.batchIndex}-of-${d.totalBatches}.zip`;

  let next = applyBatchProgressToTask(
    {
      ...t,
      downloadInFlight: true,
      activeDeviceBatchIndex: d.batchIndex,
      downloads: (t.downloads ?? []).map((x) =>
        x.batchIndex === d.batchIndex
          ? { ...x, downloadInFlight: true, autoDownloadTriggered: true }
          : x
      ),
      updatedAt: Date.now(),
    },
    `Batch ${d.batchIndex}/${d.totalBatches} — 100%. Tunggu sebentar, file akan masuk secara otomatis...`
  );
  triggeredBatchKeys.add(batchTriggerKey(t, d.batchIndex));
  writeZipBackgroundTask(next);

  const result = await saveZipBatchPartToDevice({
    filename,
    jobId: t.jobId,
    batchIndex: d.batchIndex,
    r2Key: d.r2Key ?? (d.download_url ? r2KeyFromDownloadUrl(d.download_url) : null),
    download_url: d.download_url,
    preferR2KeyFirst: true,
    preferNativeDownload: true,
    preferSavePicker: false,
  });

  if (result.ok) {
    next = applyBatchProgressToTask(
      {
        ...next,
        updatedAt: Date.now(),
      },
      `Batch ${d.batchIndex}/${d.totalBatches} — 100%. Tunggu sebentar, file akan masuk secara otomatis...`
    );
    writeZipBackgroundTask(next);
    await sleep(DEVICE_AUTO_WAIT_MS);

    const fresh = readZipBackgroundTask();
    const part = fresh?.downloads?.find((x) => x.batchIndex === d.batchIndex);
    if (part?.downloaded || fresh?.awaitingProceed?.completedBatchIndex === d.batchIndex) {
      return fresh ?? next;
    }
    next = applyBatchSaveSuccessToTask(next, d.batchIndex, result.method, result.bytes);
    writeZipBackgroundTask(next);
    triggeredBatchKeys.delete(batchTriggerKey(t, d.batchIndex));
    toast.message(`Batch ${d.batchIndex}/${d.totalBatches} — unduhan dikirim ke browser`, {
      description:
        "Cek folder Unduhan. Konfirmasi di floating card jika file sudah ada, lalu lanjut batch berikutnya.",
      duration: 14_000,
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
            autoDownloadTriggered: false,
            autoDownloadFailed: false,
            autoDownloadFailNotified: true,
          }
        : { ...x, downloadInFlight: false }
    ),
    updatedAt: Date.now(),
  });
  triggeredBatchKeys.delete(batchTriggerKey(t, d.batchIndex));
  writeZipBackgroundTask(next);
  return next;
}

async function runDeviceDownloadPass(forcedBatchIndex?: number): Promise<boolean> {
  const task = readZipBackgroundTask();
  if (!task) return false;

  const canChunked =
    isTaskChunked(task) &&
    (task.status === "processing" || task.status === "completed") &&
    Array.isArray(task.downloads) &&
    task.downloads.length > 0;

  if (canChunked) {
    const d =
      forcedBatchIndex != null
        ? findBatchDownloadPart(task, forcedBatchIndex)
        : canStartDeviceDownload(task)
          ? nextBatchToSave(task)
          : undefined;
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
  const proceedHandlingRef = useRef(false);
  const dismissTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onAbort = () => {
      pollInFlightRef.current = false;
      downloadInFlightRef.current = false;
      triggeredBatchKeys.clear();
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
      const d = nextBatchToSave(task);
      if (!d && !getSingleZipDownloadUrl(task)) return;
      if (d && !claimBatchForAutoDownload(task, d.batchIndex)) return;

      const forcedBatch = d?.batchIndex;
      downloadInFlightRef.current = true;

      window.setTimeout(() => {
        void runDeviceDownloadPass(forcedBatch)
          .catch((e) => {
            console.warn(
              "[ZipBackgroundRunner] Download error:",
              e instanceof Error ? e.message : e
            );
          })
          .finally(() => {
            downloadInFlightRef.current = false;
          });
      }, d ? SERVER_SUCCESS_BEFORE_DEVICE_MS : 0);
    };

    const pollOnce = async (force = false) => {
      if (cancelled || (!force && pollInFlightRef.current)) return;
      const task = readZipBackgroundTask();
      if (!shouldContinuePolling(task)) {
        if (task && allZipPartsHandled(task)) scheduleDismiss();
        return;
      }

      pollInFlightRef.current = true;
      try {
        const res = await fetch(`/api/qr/download-job/${task!.jobId}`, { cache: "no-store" });
        if (!res.ok) {
          console.warn("[ZipBackgroundRunner] Poll HTTP", res.status, task!.jobId);
          return;
        }
        const data = await res.json();
        let latest = readZipBackgroundTask();
        if (!latest) return;

        let healed = healOrphanAutoDownloadClaim(latest);
        healed = healStuckAutoDownloadClaim(healed);
        healed = healStuckDeviceDownload(healed);
        if (healed !== latest) {
          writeZipBackgroundTask(healed);
          latest = healed;
        }

        const fromServer = mapJobResultToTask(latest, data);
        const next = mergePollWithLocalState(
          healed,
          fromServer,
          typeof data.progressMessage === "string" ? data.progressMessage : null
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
      if (proceedHandlingRef.current) return;
      proceedHandlingRef.current = true;
      void pollOnce(true).finally(() => {
        window.setTimeout(() => {
          const latest = readZipBackgroundTask();
          if (
            latest &&
            canStartDeviceDownload(latest) &&
            (nextBatchToSave(latest) || getSingleZipDownloadUrl(latest))
          ) {
            triggerDownload();
          }
          proceedHandlingRef.current = false;
        }, 150);
      });
    };
    window.addEventListener(ZIP_BATCH_PROCEED_EVENT, onProceed);

    const intervalId = window.setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
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
