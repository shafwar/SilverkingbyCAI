"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, X } from "lucide-react";
import { useDownload } from "@/contexts/DownloadContext";
import {
  clearZipBackgroundTask,
  readZipBackgroundTask,
  subscribeZipBackgroundTask,
  type ZipBackgroundTask,
} from "@/lib/zip-background-task-store";

function triggerBrowserDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function ZipBackgroundFloating() {
  const [task, setTask] = useState<ZipBackgroundTask | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const { setDownloadPercent, setDownloadLabel } = useDownload();

  useEffect(() => {
    const sync = () => setTask(readZipBackgroundTask());
    sync();
    return subscribeZipBackgroundTask(sync);
  }, []);

  useEffect(() => {
    if (!task) {
      setDownloadPercent(null);
      setDownloadLabel("");
      return;
    }
    setDownloadPercent(Math.max(0, Math.min(100, Math.round(task.progressPercent))));
    setDownloadLabel(task.progressLabel || "ZIP diproses di background...");
  }, [task, setDownloadLabel, setDownloadPercent]);

  useEffect(() => {
    if (!task) return;
    if (task.status === "completed" || task.status === "failed") return;

    const ac = new AbortController();
    const poll = async () => {
      try {
        const res = await fetch(`/api/qr/download-job/${task.jobId}`, {
          signal: ac.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const progressPercent = Number.isFinite(data.progressPercent)
          ? Number(data.progressPercent)
          : task.progressPercent;
        const progressLabel =
          typeof data.progressMessage === "string" && data.progressMessage.trim()
            ? data.progressMessage
            : data.status === "PROCESSING"
              ? "Membuat ZIP & mengunggah ke R2..."
              : "ZIP diproses di background...";
        const next: ZipBackgroundTask = {
          ...task,
          cacheKey: typeof data.cacheKey === "string" ? data.cacheKey : task.cacheKey,
          status:
            data.status === "COMPLETED"
              ? "completed"
              : data.status === "FAILED"
                ? "failed"
                : data.status === "PROCESSING"
                  ? "processing"
                  : "pending",
          progressPercent,
          progressLabel,
          totalFiles: data.result?.total_files ?? data.result?.fileCount ?? task.totalFiles,
          download_url: data.result?.download_url ?? data.result?.downloadUrl ?? task.download_url,
          downloads: Array.isArray(data.result?.downloads)
            ? data.result.downloads.map((d: any) => ({
                batchIndex: d.batchIndex,
                totalBatches: d.totalBatches,
                download_url: d.download_url,
                r2Key: d.r2Key,
                fileCount: d.fileCount,
                downloaded:
                  task.downloads?.find(
                    (x) => x.batchIndex === d.batchIndex && x.totalBatches === d.totalBatches
                  )?.downloaded ?? false,
                autoDownloadFailed:
                  task.downloads?.find(
                    (x) => x.batchIndex === d.batchIndex && x.totalBatches === d.totalBatches
                  )?.autoDownloadFailed ?? false,
              }))
            : task.downloads,
          lastError:
            data.status === "FAILED" ? data.errorMessage || "Pembuatan ZIP gagal." : task.lastError,
          updatedAt: Date.now(),
        };
        window.localStorage.setItem("sk_zip_background_task_v1", JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("sk-zip-task-changed"));
      } catch {
        // ignore network hiccups; next poll continues
      }
    };

    const interval = window.setInterval(() => {
      void poll();
    }, 2500);
    void poll();
    return () => {
      ac.abort();
      window.clearInterval(interval);
    };
  }, [task]);

  useEffect(() => {
    if (!task || task.status !== "completed") return;

    let changed = false;
    const next: ZipBackgroundTask = { ...task };
    if (Array.isArray(next.downloads) && next.downloads.length > 0) {
      next.downloads = next.downloads.map((d) => {
        if (d.downloaded) return d;
        try {
          triggerBrowserDownload(
            d.download_url,
            `${task.batchName.replace(/\s+/g, "-")}-batch-${d.batchIndex}-of-${d.totalBatches}.zip`
          );
          changed = true;
          return { ...d, downloaded: true };
        } catch {
          changed = true;
          return { ...d, autoDownloadFailed: true };
        }
      });
    } else if (next.download_url && !next.singleDownloaded) {
      try {
        triggerBrowserDownload(next.download_url, `${task.batchName.replace(/\s+/g, "-")}.zip`);
        next.singleDownloaded = true;
        changed = true;
      } catch {
        next.singleAutoDownloadFailed = true;
        changed = true;
      }
    }

    if (changed) {
      window.localStorage.setItem("sk_zip_background_task_v1", JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("sk-zip-task-changed"));
    }
  }, [task]);

  const manualPending = useMemo(() => {
    if (!task) return [];
    return (task.downloads || []).filter((d) => d.autoDownloadFailed && !d.downloaded);
  }, [task]);

  if (!task) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[10010] w-[340px] max-w-[92vw]">
      <div className="rounded-xl border border-white/15 bg-black/90 p-3 shadow-xl backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">ZIP background process</p>
            <p className="truncate text-[11px] text-white/60">{task.batchName}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="rounded-md border border-white/20 px-2 py-1 text-[10px] text-white/70 hover:bg-white/10"
            >
              {collapsed ? "Show" : "Hide"}
            </button>
            <button
              type="button"
              onClick={() => clearZipBackgroundTask()}
              className="rounded-md border border-white/20 p-1 text-white/70 hover:bg-red-500/15 hover:text-red-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {!collapsed && (
          <>
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#FFD700]/75 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, task.progressPercent))}%` }}
              />
            </div>
            <p className="mb-2 text-[11px] text-white/70">
              {task.progressLabel} ({Math.round(task.progressPercent)}%)
            </p>
            {task.status === "completed" && (
              <p className="mb-2 text-[11px] text-emerald-300">
                Selesai. ZIP otomatis diunduh; link tetap tersimpan seperti sekarang.
              </p>
            )}
            {task.status === "failed" && (
              <p className="mb-2 text-[11px] text-red-300">{task.lastError || "ZIP gagal dibuat."}</p>
            )}
            {manualPending.length > 0 && (
              <div className="space-y-1.5">
                {manualPending.map((d) => (
                  <a
                    key={`${d.batchIndex}-${d.totalBatches}`}
                    href={d.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#FFD700]/35 bg-[#FFD700]/10 px-2 py-1.5 text-[11px] font-medium text-[#FFD700] hover:bg-[#FFD700]/20"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download manual batch {d.batchIndex}/{d.totalBatches}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
