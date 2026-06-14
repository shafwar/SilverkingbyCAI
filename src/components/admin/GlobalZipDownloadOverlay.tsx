"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DownloadCard, type ZipBatchUiRow } from "@/components/admin/DownloadCard";
import { ZipBackgroundRunner } from "@/components/admin/ZipBackgroundRunner";
import { useDownload } from "@/contexts/DownloadContext";
import {
  readZipBackgroundTask,
  subscribeZipBackgroundTask,
  type ZipBackgroundTask,
} from "@/lib/zip-background-task-store";
import { finishAndClearZipBackgroundTask, cancelZipBackgroundMonitoringAndReset } from "@/lib/zip-background-task-lifecycle";
import { toast } from "sonner";
import { isChunkedZipResult } from "@/lib/serticard-zip-result";
import { computeZipBatchProgressView } from "@/lib/zip-batch-progress";
import { getDownloadedBatchIndices } from "@/lib/zip-batch-download-tracker";

const AUTO_DISMISS_MS = 1200;

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

  const handleOpenZipBatch = useCallback(() => {
    const t = readZipBackgroundTask();
    if (!t) return;
    const target = `/admin/qr-preview/page2?openZip=1&zipBatchId=${encodeURIComponent(String(t.batchId))}`;
    window.location.href = target;
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

  const zipBatches: ZipBatchUiRow[] | undefined = useMemo(() => {
    if (!chunked || !task?.downloads?.length) return undefined;
    const browserDownloaded = task.cacheKey ? getDownloadedBatchIndices(task.cacheKey) : [];
    return task.downloads.map((d) => ({
      batchIndex: d.batchIndex,
      totalBatches: d.totalBatches,
      fileCount: d.fileCount,
      downloaded: !!(d.downloaded || browserDownloaded.includes(d.batchIndex)),
      failed: !!d.autoDownloadFailed,
      ready: !!(d.download_url?.trim() || serverDone),
      inProgress: !!d.downloadInFlight,
    }));
  }, [chunked, task?.downloads, task?.cacheKey, serverDone]);

  const subtitle = useMemo(() => {
    if (!task) return undefined;
    if (progressView && progressView.totalBatches > 1) {
      const { currentBatchIndex, totalBatches, batchesCompletedOnDevice, phase } = progressView;
      if (phase === "complete") {
        return `Semua ${totalBatches} batch sudah di perangkat Anda.`;
      }
      return `Batch ${currentBatchIndex}/${totalBatches} · ${batchesCompletedOnDevice} sudah di perangkat · progress per batch 0–100%`;
    }
    if (chunked && task.downloads?.length) {
      const total = task.downloads[0]?.totalBatches ?? task.downloads.length;
      if (serverDone && zipOnDevice) {
        return `Semua ${total} batch sudah di perangkat Anda.`;
      }
      return `Total ${task.totalFiles ?? "?"} file · ${total} batch ZIP`;
    }
    if (serverDone && !zipOnDevice) {
      return "Mengunduh ZIP ke perangkat Anda secara otomatis...";
    }
    return undefined;
  }, [task, chunked, progressView, serverDone, zipOnDevice]);

  // Auto-close floating UI when 100% and all files on device
  useEffect(() => {
    if (!isComplete) return;
    const id = window.setTimeout(() => {
      finishAndClearZipBackgroundTask(resetDownload);
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [isComplete, resetDownload]);

  // Also auto-close when auto-download failed — user unduh dari modal batch
  useEffect(() => {
    if (!task?.manualDownloadRequired || !serverDone) return;
    const id = window.setTimeout(() => {
      finishAndClearZipBackgroundTask(resetDownload);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [task?.manualDownloadRequired, serverDone, resetDownload]);

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
        onCardClick={task && !isComplete ? handleOpenZipBatch : undefined}
        isComplete={isComplete}
        zipBatches={zipBatches}
        readOnlyBatches
      />
      <ZipBackgroundRunner />
    </>
  );
}
