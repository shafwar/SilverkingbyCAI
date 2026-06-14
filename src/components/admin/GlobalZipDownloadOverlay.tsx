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
  requestRedownloadZipBatch,
} from "@/lib/zip-background-task-lifecycle";
import { toast } from "sonner";
import { isChunkedZipResult } from "@/lib/serticard-zip-result";
import { computeZipBatchProgressView } from "@/lib/zip-batch-progress";

const AUTO_DISMISS_MS = 2500;

export function GlobalZipDownloadOverlay() {
  const { downloadState, resetDownload, setIsDownloadMinimized } = useDownload();
  const [task, setTask] = useState<ZipBackgroundTask | null>(null);

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

  const handleRedownloadBatch = useCallback((batchIndex: number) => {
    if (requestRedownloadZipBatch(batchIndex)) {
      toast.message(`Mengunduh ulang Batch ${batchIndex}...`);
    }
  }, []);

  const showCard = downloadState.percent !== null || task != null;

  const chunked = task ? isChunkedZipResult(task) : false;
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
    return {
      ...task.awaitingProceed,
      isPaused: !!task.downloadsPaused,
    };
  }, [task?.awaitingProceed, task?.downloadsPaused]);

  const zipBatches: ZipBatchUiRow[] | undefined = useMemo(() => {
    if (!chunked || !task?.downloads?.length) return undefined;
    return task.downloads.map((d) => ({
      batchIndex: d.batchIndex,
      totalBatches: d.totalBatches,
      fileCount: d.fileCount,
      downloaded: !!d.downloaded,
      pendingConfirm: !!d.pendingSaveConfirm,
      failed: !!d.autoDownloadFailed,
      ready: !!(d.download_url?.trim() || serverDone),
      inProgress: !!d.downloadInFlight,
      paused: !!task.downloadsPaused && d.pendingSaveConfirm,
    }));
  }, [chunked, task?.downloads, task?.downloadsPaused, serverDone]);

  const subtitle = useMemo(() => {
    if (!task) return undefined;
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
  }, [task, chunked, progressView, proceedPrompt, serverDone, zipOnDevice]);

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
        onRedownloadBatch={handleRedownloadBatch}
        onResumeBatchDownloads={handleResumeBatchDownloads}
      />
      <ZipBackgroundRunner />
    </>
  );
}
