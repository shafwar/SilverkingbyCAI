import type { ZipBackgroundTask, ZipTaskDownload } from "@/lib/zip-background-task-store";
import { isChunkedZipResult } from "@/lib/serticard-zip-result";

export type ZipBatchProgressPhase =
  | "server"
  | "upload"
  | "download"
  | "awaiting_proceed"
  | "paused"
  | "complete"
  | "failed";

export type ZipBatchProgressView = {
  currentBatchIndex: number;
  totalBatches: number;
  phase: ZipBatchProgressPhase;
  /** 0–100 for the current batch only (resets each batch). */
  percent: number;
  label: string;
  batchesCompletedOnDevice: number;
};

const BATCH_DARI_RE = /\(batch\s+(\d+)\s+dari\s+(\d+)\)/i;
const BATCH_SLASH_RE = /Batch\s+(\d+)\s*\/\s*(\d+)/i;
const ITEM_PCT_RE = /Item\s+\d+\s*-\s*\d+:\s*(\d+)\s*%/i;

export function parseBatchProgressMessage(message: string | null | undefined): {
  batchIndex?: number;
  totalBatches?: number;
  itemPercent?: number;
} {
  const msg = (message ?? "").trim();
  if (!msg) return {};

  let batchIndex: number | undefined;
  let totalBatches: number | undefined;

  const dari = msg.match(BATCH_DARI_RE);
  if (dari) {
    batchIndex = Number(dari[1]);
    totalBatches = Number(dari[2]);
  } else {
    const slash = msg.match(BATCH_SLASH_RE);
    if (slash) {
      batchIndex = Number(slash[1]);
      totalBatches = Number(slash[2]);
    }
  }

  const itemMatch = msg.match(ITEM_PCT_RE);
  const itemPercent = itemMatch ? Number(itemMatch[1]) : undefined;

  return {
    batchIndex: Number.isFinite(batchIndex) ? batchIndex : undefined,
    totalBatches: Number.isFinite(totalBatches) ? totalBatches : undefined,
    itemPercent: Number.isFinite(itemPercent) ? itemPercent : undefined,
  };
}

function sortedDownloads(task: ZipBackgroundTask): ZipTaskDownload[] {
  return [...(task.downloads ?? [])].sort((a, b) => a.batchIndex - b.batchIndex);
}

function totalBatchesFromTask(task: ZipBackgroundTask, parsedTotal?: number): number {
  if (parsedTotal && parsedTotal > 0) return parsedTotal;
  const dl = sortedDownloads(task);
  if (dl[0]?.totalBatches) return dl[0].totalBatches;
  return dl.length > 1 ? dl.length : 1;
}

function batchesOnDeviceCount(downloads: ZipTaskDownload[]): number {
  return downloads.filter((d) => d.downloaded).length;
}

/**
 * Floating UI progress: always 0–100 per current batch, not across all N batches.
 */
export function computeZipBatchProgressView(
  task: ZipBackgroundTask,
  serverMessage?: string | null
): ZipBatchProgressView {
  const message = (serverMessage ?? task.progressLabel ?? "").trim();
  const parsed = parseBatchProgressMessage(message);
  const downloads = sortedDownloads(task);
  const totalBatches = totalBatchesFromTask(task, parsed.totalBatches);
  const completedOnDevice = batchesOnDeviceCount(downloads);

  if (task.status === "failed") {
    return {
      currentBatchIndex: parsed.batchIndex ?? 1,
      totalBatches,
      phase: "failed",
      percent: 0,
      label: task.lastError || message || "Pembuatan ZIP gagal.",
      batchesCompletedOnDevice: completedOnDevice,
    };
  }

  if (task.awaitingProceed) {
    const { completedBatchIndex, nextBatchIndex, totalBatches: tb, savedVia } =
      task.awaitingProceed;
    const via = savedVia === "save-picker" ? "disimpan via dialog" : "unduhan browser";
    if (task.downloadsPaused) {
      return {
        currentBatchIndex: completedBatchIndex,
        totalBatches: tb,
        phase: "paused",
        percent: 100,
        label: `Batch ${completedBatchIndex}/${tb} selesai (${via}) — dijeda`,
        batchesCompletedOnDevice: completedOnDevice,
      };
    }
    return {
      currentBatchIndex: completedBatchIndex,
      totalBatches: tb,
      phase: "awaiting_proceed",
      percent: 100,
      label:
        nextBatchIndex != null
          ? `Batch ${completedBatchIndex}/${tb} selesai (${via}) — konfirmasi untuk Batch ${nextBatchIndex}`
          : `Batch ${completedBatchIndex}/${tb} selesai (${via}) — konfirmasi selesai`,
      batchesCompletedOnDevice: completedOnDevice,
    };
  }

  if (task.downloadsPaused) {
    return {
      currentBatchIndex: Math.min(completedOnDevice + 1, totalBatches),
      totalBatches,
      phase: "paused",
      percent: 0,
      label: `Unduh batch dijeda — ${completedOnDevice} batch dikonfirmasi`,
      batchesCompletedOnDevice: completedOnDevice,
    };
  }

  const inFlight = downloads.find((d) => d.downloadInFlight);
  if (inFlight) {
    return {
      currentBatchIndex: inFlight.batchIndex,
      totalBatches: inFlight.totalBatches || totalBatches,
      phase: "download",
      percent: 96,
      label: `Batch ${inFlight.batchIndex}/${inFlight.totalBatches || totalBatches} — mengunduh ke perangkat...`,
      batchesCompletedOnDevice: completedOnDevice,
    };
  }

  const readyToDownload = downloads.find(
    (d) =>
      d.download_url?.trim() &&
      !d.downloaded &&
      !d.pendingSaveConfirm &&
      !d.autoDownloadFailed
  );
  if (readyToDownload) {
    return {
      currentBatchIndex: readyToDownload.batchIndex,
      totalBatches: readyToDownload.totalBatches || totalBatches,
      phase: "download",
      percent: 92,
      label: `Batch ${readyToDownload.batchIndex}/${readyToDownload.totalBatches || totalBatches} — mulai unduh otomatis...`,
      batchesCompletedOnDevice: completedOnDevice,
    };
  }

  const allKnownOnDevice =
    downloads.length > 0 &&
    downloads.every((d) => !d.download_url?.trim() || d.downloaded || d.autoDownloadFailed);

  if (
    task.status === "completed" &&
    (task.singleDownloaded || (downloads.length > 0 && allKnownOnDevice))
  ) {
    return {
      currentBatchIndex: totalBatches,
      totalBatches,
      phase: "complete",
      percent: 100,
      label:
        totalBatches > 1
          ? `Selesai — semua ${totalBatches} batch di perangkat`
          : "Selesai — ZIP terunduh",
      batchesCompletedOnDevice: completedOnDevice || totalBatches,
    };
  }

  if (task.singleDownloadInFlight) {
    return {
      currentBatchIndex: 1,
      totalBatches: 1,
      phase: "download",
      percent: 96,
      label: "Mengunduh ZIP ke perangkat...",
      batchesCompletedOnDevice: 0,
    };
  }

  if (task.status === "completed" && !task.singleDownloaded && task.download_url) {
    return {
      currentBatchIndex: 1,
      totalBatches: 1,
      phase: "download",
      percent: 92,
      label: "ZIP siap — mengunduh ke perangkat...",
      batchesCompletedOnDevice: 0,
    };
  }

  let currentBatchIndex =
    parsed.batchIndex ??
    downloads.find((d) => !d.download_url?.trim() && !d.downloaded)?.batchIndex ??
    (completedOnDevice < totalBatches ? completedOnDevice + 1 : totalBatches);

  currentBatchIndex = Math.max(1, Math.min(currentBatchIndex, totalBatches));

  if (/Mengunggah/i.test(message)) {
    return {
      currentBatchIndex,
      totalBatches,
      phase: "upload",
      percent: 88,
      label: `Batch ${currentBatchIndex}/${totalBatches} — mengunggah ke R2...`,
      batchesCompletedOnDevice: completedOnDevice,
    };
  }

  if (/sudah ada di R2/i.test(message) || /dilewati \(resume\)/i.test(message)) {
    return {
      currentBatchIndex,
      totalBatches,
      phase: "server",
      percent: 100,
      label: `Batch ${currentBatchIndex}/${totalBatches} — sudah di R2`,
      batchesCompletedOnDevice: completedOnDevice,
    };
  }

  const itemPercent = parsed.itemPercent ?? 0;
  const serverPct = Math.max(0, Math.min(85, itemPercent > 0 ? itemPercent : 8));

  if (task.status === "pending") {
    return {
      currentBatchIndex,
      totalBatches,
      phase: "server",
      percent: 5,
      label: `Batch ${currentBatchIndex}/${totalBatches} — menunggu server...`,
      batchesCompletedOnDevice: completedOnDevice,
    };
  }

  return {
    currentBatchIndex,
    totalBatches,
    phase: "server",
    percent: serverPct,
    label:
      itemPercent > 0
        ? `Batch ${currentBatchIndex}/${totalBatches} — membuat di server (${itemPercent}%)...`
        : `Batch ${currentBatchIndex}/${totalBatches} — membuat di server...`,
    batchesCompletedOnDevice: completedOnDevice,
  };
}

export function applyBatchProgressToTask(
  task: ZipBackgroundTask,
  serverMessage?: string | null
): ZipBackgroundTask {
  const view = computeZipBatchProgressView(task, serverMessage);
  return {
    ...task,
    progressPercent: view.percent,
    progressLabel: view.label,
  };
}

export function isChunkedBackgroundTask(task: ZipBackgroundTask): boolean {
  return isChunkedZipResult({
    chunked: task.chunked,
    downloads: task.downloads,
    download_url: task.download_url,
  });
}
