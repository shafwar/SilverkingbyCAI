"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DownloadCard, type ZipBatchProceedPrompt, type ZipBatchUiRow } from "@/components/admin/DownloadCard";
import { ZipBackgroundRunner } from "@/components/admin/ZipBackgroundRunner";
import { useDownload } from "@/contexts/DownloadContext";
import {
  readZipBackgroundTask,
  subscribeZipBackgroundTask,
  type ZipBackgroundTask,
} from "@/lib/zip-background-task-store";
import {
  finishAndClearZipBackgroundTask,
  cancelZipBackgroundMonitoringAndReset,
  confirmZipBatchProceed,
  pauseZipBatchDownloads,
  resumeZipBatchDownloads,
  saveZipBatchToDevice,
} from "@/lib/zip-background-task-lifecycle";
import { toast } from "sonner";
import { isChunkedZipResult } from "@/lib/serticard-zip-result";
import { computeZipBatchProgressView } from "@/lib/zip-batch-progress";

const AUTO_DISMISS_MS = 2500;

export function GlobalZipDownloadOverlay() {
  const { downloadState, resetDownload, setIsDownloadMinimized } = useDownload();
  const [task, setTask] = useState<ZipBackgroundTask | null>(null);
  const [confirmUiTick, setConfirmUiTick] = useState(0);

  useEffect(() => {
    const sync = () => setTask(readZipBackgroundTask());
    sync();
    return subscribeZipBackgroundTask(sync);
  }, []);

  useEffect(() => {
    const onCancelled = () => {
      setTask(null);
      resetDownload();
    };
    window.addEventListener("sk-zip-monitoring-cancelled", onCancelled);
    return () => window.removeEventListener("sk-zip-monitoring-cancelled", onCancelled);
  }, [resetDownload]);

  const handleCancelMonitoring = useCallback(() => {
    cancelZipBackgroundMonitoringAndReset(resetDownload);
    toast.message("Pemantauan ZIP dibatalkan", {
      description: "Progress di browser dihentikan. File di server (R2) tetap tersimpan.",
      duration: 5000,
    });
  }, [resetDownload]);

  const handleMinimize = useCallback(() => {
    setIsDownloadMinimized(true);
  }, [setIsDownloadMinimized]);

  const handleDismissIfDone = useCallback(() => {
    const t = readZipBackgroundTask();
    if (!t) {
      resetDownload();
      return;
    }
    const chunked = isChunkedZipResult(t);
    const allOnDevice = chunked
      ? !t.downloads?.length || t.downloads.every((d) => d.downloaded)
      : !!t.singleDownloaded;
    if (t.status === "completed" && (allOnDevice || t.manualDownloadRequired)) {
      finishAndClearZipBackgroundTask(resetDownload);
      return;
    }
    handleMinimize();
  }, [handleMinimize, resetDownload]);

  const handleProceedBatch = useCallback(() => {
    if (confirmZipBatchProceed()) {
      toast.success("Batch dikonfirmasi — melanjutkan unduh berikutnya...");
    }
  }, []);

  const handlePauseBatchDownloads = useCallback(() => {
    if (pauseZipBatchDownloads()) {
      toast.message("Unduh batch dijeda", {
        description: "Klik Lanjutkan unduh batch di floating card kapan saja.",
        duration: 6000,
      });
    }
  }, []);

  const handleResumeBatchDownloads = useCallback(() => {
    if (resumeZipBatchDownloads()) {
      toast.message("Melanjutkan unduh batch...");
    }
  }, []);

  const handleSaveBatchToDevice = useCallback(async (batchIndex: number) => {
    const ok = await saveZipBatchToDevice(batchIndex);
    if (ok) {
      toast.message(`Batch ${batchIndex} — pilih lokasi simpan di laptop`);
    } else {
      toast.error("Gagal mengambil file dari R2. Coba lagi.");
    }
  }, []);

  const showCard = downloadState.percent !== null || task != null;

  const chunked = task
    ? task.chunked === true ||
      (task.downloads?.[0]?.totalBatches ?? 0) > 1 ||
      isChunkedZipResult(task)
    : false;
  const allChunkedOnDevice =
    !task?.downloads?.length || task.downloads.every((d) => d.downloaded);
  const zipOnDevice = task
    ? chunked
      ? allChunkedOnDevice
      : !!task.singleDownloaded
    : false;
  const serverDone = task?.status === "completed";
  const progressView = task ? computeZipBatchProgressView(task, task.progressLabel) : null;
  const isComplete = progressView?.phase === "complete" || (serverDone && zipOnDevice);
  const percent = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        downloadState.percent ??
          progressView?.percent ??
          task?.progressPercent ??
          0
      )
    )
  );
  const label =
    downloadState.label ||
    progressView?.label ||
    task?.progressLabel ||
    "ZIP diproses di background...";

  const proceedPrompt: ZipBatchProceedPrompt | null = useMemo(() => {
    if (!task?.awaitingProceed) return null;
    const readyAt = task.awaitingProceed.readyForConfirmAt;
    const actionsEnabled = readyAt == null || readyAt <= Date.now();
    return {
      ...task.awaitingProceed,
      isPaused: !!task.downloadsPaused,
      actionsEnabled,
    };
  }, [task?.awaitingProceed, task?.downloadsPaused, confirmUiTick]);

  useEffect(() => {
    const readyAt = task?.awaitingProceed?.readyForConfirmAt;
    if (readyAt == null || readyAt <= Date.now()) return;
    const id = window.setTimeout(() => {
      setConfirmUiTick((n) => n + 1);
    }, readyAt - Date.now() + 30);
    return () => window.clearTimeout(id);
  }, [task?.awaitingProceed?.readyForConfirmAt]);

  const waitingForAutoDownload =
    progressView?.phase === "server_complete" ||
    progressView?.phase === "device_save" ||
    progressView?.phase === "device_auto_pending";

  const zipBatches: ZipBatchUiRow[] | undefined = useMemo(() => {
    if (!chunked || !task?.downloads?.length) return undefined;
    const activeIdx =
      task.activeDeviceBatchIndex ??
      task.downloads.find((d) => d.downloadInFlight)?.batchIndex ??
      null;
    const totalBatches = task.downloads[0]?.totalBatches ?? task.downloads.length;

    return task.downloads.map((d) => {
      const onR2 = !!(d.download_url?.trim() || d.r2Key?.trim() || serverDone);
      const isActive = activeIdx != null && d.batchIndex === activeIdx && !!d.downloadInFlight;
      const waitingTurn =
        onR2 &&
        !d.downloaded &&
        !d.pendingSaveConfirm &&
        !d.autoDownloadFailed &&
        activeIdx != null &&
        d.batchIndex !== activeIdx &&
        !task.awaitingProceed;

      return {
        batchIndex: d.batchIndex,
        totalBatches: d.totalBatches || totalBatches,
        fileCount: d.fileCount,
        downloaded: !!d.downloaded,
        pendingConfirm: !!d.pendingSaveConfirm,
        failed: !!d.autoDownloadFailed,
        ready: onR2 && !d.downloaded && !isActive && !waitingTurn,
        inProgress: isActive,
        paused: !!task.downloadsPaused && !!d.pendingSaveConfirm,
        waitingTurn,
      };
    });
  }, [
    chunked,
    task?.downloads,
    task?.activeDeviceBatchIndex,
    task?.awaitingProceed,
    task?.downloadsPaused,
    serverDone,
  ]);

  const saveFallback = useMemo(() => {
    if (!task || proceedPrompt) return null;
    if (task.downloadInFlight || task.singleDownloadInFlight) return null;
    if (task.downloads?.some((d) => d.downloadInFlight)) return null;
    if (
      progressView?.phase === "device_save" ||
      progressView?.phase === "server_complete" ||
      progressView?.phase === "device_auto_pending" ||
      progressView?.phase === "awaiting_proceed"
    ) {
      return null;
    }

    const sorted = [...(task.downloads ?? [])].sort((a, b) => a.batchIndex - b.batchIndex);
    const needsManual = sorted.find(
      (d) =>
        (d.download_url?.trim() || d.r2Key?.trim()) &&
        !d.downloaded &&
        !d.pendingSaveConfirm &&
        !d.downloadInFlight &&
        (d.autoDownloadFailNotified || progressView?.phase === "manual_retry")
    );
    if (!needsManual) return null;

    return {
      batchIndex: needsManual.batchIndex,
      totalBatches: needsManual.totalBatches || task.downloads?.[0]?.totalBatches || 1,
    };
  }, [task, proceedPrompt, progressView?.phase]);

  const subtitle = useMemo(() => {
    if (!task) return undefined;
    if (waitingForAutoDownload) {
      return "100% di server — tunggu sebentar, file akan masuk secara otomatis ke folder Unduhan.";
    }
    if (proceedPrompt && !proceedPrompt.isPaused) {
      return "Konfirmasi setiap batch sebelum lanjut — file harus benar-benar ada di komputer Anda.";
    }
    if (progressView && progressView.totalBatches > 1) {
      const { currentBatchIndex, totalBatches, batchesCompletedOnDevice, phase } = progressView;
      if (phase === "complete") {
        return `Semua ${totalBatches} batch dikonfirmasi di perangkat Anda.`;
      }
      if (phase === "paused") {
        return `${batchesCompletedOnDevice}/${totalBatches} batch dikonfirmasi · unduh dijeda`;
      }
      return `Batch ${currentBatchIndex}/${totalBatches} · ${batchesCompletedOnDevice} dikonfirmasi · progress per batch 0–100%`;
    }
    if (chunked && task.downloads?.length) {
      const total = task.downloads[0]?.totalBatches ?? task.downloads.length;
      if (serverDone && zipOnDevice) {
        return `Semua ${total} batch dikonfirmasi di perangkat Anda.`;
      }
      return `Total ${task.totalFiles ?? "?"} file · ${total} batch ZIP`;
    }
    if (serverDone && !zipOnDevice) {
      return "Mengunduh ZIP ke perangkat Anda...";
    }
    return undefined;
  }, [task, chunked, progressView, proceedPrompt, serverDone, zipOnDevice, waitingForAutoDownload]);

  useEffect(() => {
    if (!isComplete || proceedPrompt) return;
    const id = window.setTimeout(() => {
      finishAndClearZipBackgroundTask(resetDownload);
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [isComplete, proceedPrompt, resetDownload]);

  useEffect(() => {
    if (!task?.manualDownloadRequired || !serverDone || proceedPrompt) return;
    const id = window.setTimeout(() => {
      finishAndClearZipBackgroundTask(resetDownload);
    }, 6000);
    return () => window.clearTimeout(id);
  }, [task?.manualDownloadRequired, serverDone, proceedPrompt, resetDownload]);

  if (!showCard) {
    return <ZipBackgroundRunner />;
  }

  return (
    <>
      <DownloadCard
        percent={percent}
        label={label}
        subtitle={subtitle}
        onCancel={handleCancelMonitoring}
        onMinimize={handleMinimize}
        onDismiss={handleDismissIfDone}
        isMinimized={downloadState.isMinimized}
        onToggleMinimize={() => setIsDownloadMinimized(!downloadState.isMinimized)}
        isComplete={isComplete}
        zipBatches={zipBatches}
        readOnlyBatches
        proceedPrompt={proceedPrompt}
        onProceedBatch={handleProceedBatch}
        onPauseBatchDownloads={handlePauseBatchDownloads}
        onSaveBatchToDevice={(idx) => void handleSaveBatchToDevice(idx)}
        onResumeBatchDownloads={handleResumeBatchDownloads}
        saveFallback={saveFallback}
        progressPhase={progressView?.phase}
        waitingForAutoDownload={waitingForAutoDownload}
      />
      <ZipBackgroundRunner />
    </>
  );
}
