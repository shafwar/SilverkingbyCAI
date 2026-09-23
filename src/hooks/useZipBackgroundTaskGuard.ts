"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelZipBackgroundMonitoring,
  confirmLeaveAdminWhileZipActive,
  isZipBackgroundTaskBlocking,
} from "@/lib/zip-background-task-guard";
import {
  readZipBackgroundTask,
  subscribeZipBackgroundTask,
  type ZipBackgroundTask,
} from "@/lib/zip-background-task-store";

export function useZipBackgroundTaskGuard() {
  const [task, setTask] = useState<ZipBackgroundTask | null>(null);

  useEffect(() => {
    const sync = () => setTask(readZipBackgroundTask());
    sync();
    return subscribeZipBackgroundTask(sync);
  }, []);

  const isBlocking = isZipBackgroundTaskBlocking(task);

  const cancelMonitoring = useCallback(() => {
    cancelZipBackgroundMonitoring();
    setTask(null);
  }, []);

  const confirmLeaveOrStay = useCallback((): boolean => {
    if (!isZipBackgroundTaskBlocking(readZipBackgroundTask())) return true;
    if (!confirmLeaveAdminWhileZipActive()) return false;
    cancelMonitoring();
    return true;
  }, [cancelMonitoring]);

  return {
    task,
    isBlocking,
    cancelMonitoring,
    confirmLeaveOrStay,
  };
}
