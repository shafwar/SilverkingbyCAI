"use client";

import { useCallback } from "react";
import { DownloadCard } from "@/components/admin/DownloadCard";
import { ZipBackgroundRunner } from "@/components/admin/ZipBackgroundRunner";
import { useDownload } from "@/contexts/DownloadContext";
import { clearZipBackgroundTask, readZipBackgroundTask } from "@/lib/zip-background-task-store";

export function GlobalZipDownloadOverlay() {
  const { downloadState, cancelDownload, resetDownload, setIsDownloadMinimized } = useDownload();

  const handleDownloadCardCancel = useCallback(() => {
    if (readZipBackgroundTask()) {
      if (
        !window.confirm(
          "Jika Anda klik X, pemantauan ZIP di browser ini akan berhenti.\n\nProses pembuatan ZIP di server tetap bisa berjalan di background. Lanjut tutup?"
        )
      ) {
        return;
      }
      clearZipBackgroundTask();
      resetDownload();
      window.location.reload();
      return;
    }
    cancelDownload();
    window.location.reload();
  }, [cancelDownload, resetDownload]);

  const handleOpenZipBatch = useCallback(() => {
    const task = readZipBackgroundTask();
    if (!task) return;
    const target = `/admin/qr-preview/page2?openZip=1&zipBatchId=${encodeURIComponent(String(task.batchId))}`;
    window.location.href = target;
  }, []);

  return (
    <>
      {downloadState.percent !== null && (
        <DownloadCard
          percent={downloadState.percent}
          label={downloadState.label}
          onCancel={handleDownloadCardCancel}
          isMinimized={downloadState.isMinimized}
          onToggleMinimize={() => setIsDownloadMinimized(!downloadState.isMinimized)}
          onCardClick={handleOpenZipBatch}
        />
      )}
      <ZipBackgroundRunner />
    </>
  );
}
