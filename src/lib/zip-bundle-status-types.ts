/** Client-safe types mirroring /api/qr/zip-ready `bundle` payload. */

export type ZipBundlePhase =
  | "NOT_STARTED"
  | "GENERATING"
  | "PARTIAL_R2"
  | "R2_COMPLETE"
  | "FROZEN_DOWNLOADED"
  | "FAILED";

export type ZipBundleBatchRow = {
  batchIndex: number;
  totalBatches: number;
  fileCount?: number;
  r2Key?: string;
  downloadUrl?: string;
  onR2: boolean;
  downloaded: boolean;
  lastDownloadedAt?: string | null;
};

export type ZipBundleStatus = {
  cacheKey: string;
  phase: ZipBundlePhase;
  frozen: boolean;
  canGenerate: boolean;
  canDownload: boolean;
  lockReason?: string;
  totalBatches: number;
  batchesOnR2Count: number;
  batchesDownloadedCount: number;
  totalFiles: number;
  jobId: number | null;
  jobStatus: string | null;
  progressPercent: number;
  cached: boolean;
  frozenAt: string | null;
  allDownloadedAt: string | null;
  message: string;
  batches: ZipBundleBatchRow[];
};
