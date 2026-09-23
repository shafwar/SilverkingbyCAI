"use client";

import { useCallback, useEffect, useState } from "react";
import { useDownload } from "@/contexts/DownloadContext";
import {
  getActiveZipDownloadBatchLabel,
  isAnyZipDownloadBusy,
  isZipDownloadSessionActive,
  ZIP_DOWNLOAD_BUSY_HINT,
  ZIP_DOWNLOAD_BUSY_TITLE,
} from "@/lib/zip-background-task-guard";
import {
  readZipDownloadSessionLock,
  subscribeZipDownloadSessionLock,
  type ZipDownloadSessionLock,
} from "@/lib/zip-download-session-lock";
import {
  readZipBackgroundTask,
  subscribeZipBackgroundTask,
  type ZipBackgroundTask,
} from "@/lib/zip-background-task-store";
import { toast } from "sonner";

export function useZipDownloadSessionBusy() {
  const { downloadState } = useDownload();
  const [task, setTask] = useState<ZipBackgroundTask | null>(null);
  const [lock, setLock] = useState<ZipDownloadSessionLock | null>(null);

  const sync = useCallback(() => {
    setTask(readZipBackgroundTask());
    setLock(readZipDownloadSessionLock());
  }, []);

  useEffect(() => {
    sync();
    const unsubTask = subscribeZipBackgroundTask(sync);
    const unsubLock = subscribeZipDownloadSessionLock(sync);
    const onCancelled = () => sync();
    window.addEventListener("sk-zip-monitoring-cancelled", onCancelled);
    return () => {
      unsubTask();
      unsubLock();
      window.removeEventListener("sk-zip-monitoring-cancelled", onCancelled);
    };
  }, [sync]);

  const isBusy =
    isZipDownloadSessionActive(task) ||
    lock != null ||
    downloadState.percent != null;

  const activeBatchId = task?.batchId ?? lock?.batchId ?? null;
  const activeBatchLabel = getActiveZipDownloadBatchLabel();

  const notifyIfBusy = useCallback((): boolean => {
    if (!isAnyZipDownloadBusy() && downloadState.percent == null) return false;
    const label = activeBatchLabel;
    toast.message(ZIP_DOWNLOAD_BUSY_TITLE, {
      description: label
        ? `${label} — ${ZIP_DOWNLOAD_BUSY_HINT}`
        : ZIP_DOWNLOAD_BUSY_HINT,
      duration: 5000,
    });
    return true;
  }, [activeBatchLabel, downloadState.percent]);

  return {
    isBusy,
    activeBatchId,
    activeBatchLabel,
    task,
    lock,
    notifyIfBusy,
  };
}
