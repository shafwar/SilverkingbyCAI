/**
 * Server-side ZIP bundle status: R2 + audit + cache + job → phase, locks, batch rows.
 */

import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { SERTICARD_ZIP_CHUNK_SIZE } from "@/lib/serticard-zip-result";
import { r2KeyFromDownloadUrl } from "@/lib/zip-r2-key";

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
  /** Partial result metadata when job still running */
  partialDownloads?: ZipBundleBatchRow[];
};

function getR2Client(): { client: S3Client; bucket: string } | null {
  const R2_ENDPOINT = process.env.R2_ENDPOINT;
  const R2_BUCKET = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;

  let normalizedR2Endpoint: string | null = null;
  if (R2_ENDPOINT) normalizedR2Endpoint = R2_ENDPOINT.replace(/\/[^/]+$/, "").replace(/\/$/, "");
  else if (R2_ACCOUNT_ID) normalizedR2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  if (
    !normalizedR2Endpoint ||
    !R2_BUCKET ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY
  ) {
    return null;
  }

  return {
    client: new S3Client({
      region: "auto",
      endpoint: normalizedR2Endpoint,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
      forcePathStyle: true,
      maxAttempts: 2,
    }),
    bucket: R2_BUCKET,
  };
}

async function headR2Exists(r2Key: string): Promise<boolean | null> {
  const r2 = getR2Client();
  if (!r2) return null;
  try {
    await r2.client.send(new HeadObjectCommand({ Bucket: r2.bucket, Key: r2Key }));
    return true;
  } catch (e: unknown) {
    const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) return false;
    return null;
  }
}

type ResultLike = {
  success?: boolean;
  chunked?: boolean;
  total_files?: number;
  fileCount?: number;
  download_url?: string;
  downloadUrl?: string;
  downloads?: Array<{
    batchIndex?: number;
    totalBatches?: number;
    download_url?: string;
    downloadUrl?: string;
    r2Key?: string;
    fileCount?: number;
  }>;
};

function parseResultParts(result: ResultLike | null | undefined): Array<{
  batchIndex: number;
  totalBatches: number;
  r2Key: string;
  downloadUrl: string;
  fileCount?: number;
}> {
  if (!result) return [];
  const downloads = Array.isArray(result.downloads) ? result.downloads : [];
  if (downloads.length > 0) {
    return downloads
      .map((d) => {
        const r2Key =
          (typeof d.r2Key === "string" && d.r2Key.trim()) ||
          (typeof d.download_url === "string" ? r2KeyFromDownloadUrl(d.download_url) : null) ||
          (typeof d.downloadUrl === "string" ? r2KeyFromDownloadUrl(d.downloadUrl) : null);
        const downloadUrl =
          (typeof d.download_url === "string" && d.download_url) ||
          (typeof d.downloadUrl === "string" && d.downloadUrl) ||
          "";
        if (!r2Key) return null;
        return {
          batchIndex: Number(d.batchIndex ?? 0),
          totalBatches: Number(d.totalBatches ?? downloads.length),
          r2Key,
          downloadUrl,
          fileCount: d.fileCount,
        };
      })
      .filter(Boolean) as Array<{
      batchIndex: number;
      totalBatches: number;
      r2Key: string;
      downloadUrl: string;
      fileCount?: number;
    }>;
  }
  const singleUrl = result.download_url || result.downloadUrl;
  if (typeof singleUrl === "string" && singleUrl.trim()) {
    const r2Key = r2KeyFromDownloadUrl(singleUrl);
    if (r2Key) {
      return [
        {
          batchIndex: 1,
          totalBatches: 1,
          r2Key,
          downloadUrl: singleUrl,
          fileCount: result.total_files ?? result.fileCount,
        },
      ];
    }
  }
  return [];
}

function expectedTotalBatches(totalFiles: number, parts: ReturnType<typeof parseResultParts>): number {
  if (parts.length > 0 && parts[0]!.totalBatches > 0) return parts[0]!.totalBatches;
  if (totalFiles > SERTICARD_ZIP_CHUNK_SIZE) {
    return Math.ceil(totalFiles / SERTICARD_ZIP_CHUNK_SIZE);
  }
  return 1;
}

/** Sync QrZipBundleState from computed status. */
export async function syncZipBundleState(status: ZipBundleStatus): Promise<void> {
  const onR2 = status.batches.filter((b) => b.onR2).map((b) => b.batchIndex);
  const downloaded = status.batches.filter((b) => b.downloaded).map((b) => b.batchIndex);
  const now = new Date();
  await prisma.qrZipBundleState.upsert({
    where: { cacheKey: status.cacheKey },
    create: {
      cacheKey: status.cacheKey,
      totalBatches: status.totalBatches,
      totalFiles: status.totalFiles,
      batchesOnR2: onR2,
      batchesDownloaded: downloaded,
      allOnR2At:
        status.batchesOnR2Count >= status.totalBatches && status.totalBatches > 0 ? now : null,
      allDownloadedAt: status.frozen ? now : null,
      frozenAt: status.frozen ? now : null,
      lastJobId: status.jobId,
    },
    update: {
      totalBatches: status.totalBatches,
      totalFiles: status.totalFiles,
      batchesOnR2: onR2,
      batchesDownloaded: downloaded,
      allOnR2At:
        status.batchesOnR2Count >= status.totalBatches && status.totalBatches > 0
          ? now
          : undefined,
      allDownloadedAt: status.frozen ? now : undefined,
      frozenAt: status.frozen ? now : null,
      lastJobId: status.jobId ?? undefined,
      updatedAt: now,
    },
  });
}

export type ResolveZipBundleOptions = {
  cacheKey: string;
  itemCount?: number;
};

export async function resolveZipBundleStatus(
  opts: ResolveZipBundleOptions
): Promise<ZipBundleStatus> {
  const { cacheKey, itemCount = 0 } = opts;

  const [cached, bundleRow, latestJobAgg] = await Promise.all([
    prisma.qrZipDownloadCache.findUnique({ where: { cacheKey } }),
    prisma.qrZipBundleState.findUnique({ where: { cacheKey } }),
    prisma.qrZipDownloadJob.aggregate({
      where: { cacheKey },
      _max: { id: true },
    }),
  ]);

  const bundleDownloadedSet = new Set<number>(
    Array.isArray(bundleRow?.batchesDownloaded)
      ? (bundleRow!.batchesDownloaded as number[]).filter((n) => Number.isFinite(n))
      : []
  );

  const latestJob = latestJobAgg._max.id
    ? await prisma.qrZipDownloadJob.findUnique({ where: { id: latestJobAgg._max.id } })
    : null;

  const jobStatus = latestJob?.status ?? null;
  const jobId = latestJob?.id ?? null;
  const progressPercent = latestJob?.progressPercent ?? 0;

  let result: ResultLike | null = (cached?.result as ResultLike) ?? null;
  let cachedFlag = !!cached;

  if (!result && latestJob?.status === "COMPLETED" && latestJob.result) {
    result = latestJob.result as ResultLike;
  }
  if (
    !result &&
    latestJob &&
    (latestJob.status === "PROCESSING" || latestJob.status === "PENDING") &&
    latestJob.result
  ) {
    result = latestJob.result as ResultLike;
  }
  if (!result && latestJob?.status === "FAILED" && latestJob.result) {
    result = latestJob.result as ResultLike;
  }

  const parts = parseResultParts(result);
  const totalFiles =
    result?.total_files ??
    result?.fileCount ??
    itemCount ??
    (bundleRow?.totalFiles ?? 0);
  const totalBatches = expectedTotalBatches(totalFiles, parts);

  const auditRows = await prisma.qrZipDownloadAudit.findMany({
    where: { cacheKey },
    orderBy: { downloadedAt: "desc" },
  });
  const auditByR2 = new Map<string, { count: number; lastAt: Date }>();
  for (const a of auditRows) {
    const prev = auditByR2.get(a.r2Key);
    auditByR2.set(a.r2Key, {
      count: (prev?.count ?? 0) + 1,
      lastAt: prev?.lastAt && prev.lastAt > a.downloadedAt ? prev.lastAt : a.downloadedAt,
    });
  }

  const partByIndex = new Map(parts.map((p) => [p.batchIndex, p]));
  const batches: ZipBundleBatchRow[] = [];

  for (let i = 1; i <= totalBatches; i++) {
    const part = partByIndex.get(i);
    const r2Key = part?.r2Key;
    let onR2 = false;
    if (r2Key) {
      const exists = await headR2Exists(r2Key);
      onR2 = exists === true;
    }
    const audit = r2Key ? auditByR2.get(r2Key) : undefined;
    const downloaded =
      (audit?.count ?? 0) > 0 || bundleDownloadedSet.has(i);
    batches.push({
      batchIndex: i,
      totalBatches,
      fileCount: part?.fileCount,
      r2Key,
      downloadUrl: part?.downloadUrl,
      onR2,
      downloaded,
      lastDownloadedAt: audit?.lastAt?.toISOString() ?? null,
    });
  }

  const batchesOnR2Count = batches.filter((b) => b.onR2).length;
  const batchesDownloadedCount = batches.filter((b) => b.downloaded).length;
  const allOnR2 = batchesOnR2Count >= totalBatches && totalBatches > 0;
  const allDownloaded = batchesDownloadedCount >= totalBatches && totalBatches > 0;

  let phase: ZipBundlePhase = "NOT_STARTED";
  let message = "Belum ada ZIP untuk kombinasi batch + template ini.";

  if (bundleRow?.frozenAt && allOnR2 && allDownloaded) {
    phase = "FROZEN_DOWNLOADED";
    message =
      "Semua batch lengkap di R2 dan sudah pernah diunduh. Tidak perlu generate atau unduh ulang.";
  } else if (allOnR2 && allDownloaded) {
    phase = "FROZEN_DOWNLOADED";
    message =
      "Semua batch lengkap di R2 dan sudah pernah diunduh. Tidak perlu generate atau unduh ulang.";
  } else if (jobStatus === "FAILED") {
    phase = batchesOnR2Count > 0 ? "PARTIAL_R2" : "FAILED";
    message =
      batchesOnR2Count > 0
        ? `${batchesOnR2Count}/${totalBatches} batch di R2. Proses akan dilanjutkan otomatis.`
        : latestJob?.errorMessage || "Pembuatan ZIP gagal.";
  } else if (
    jobStatus === "PENDING" ||
    jobStatus === "PROCESSING"
  ) {
    phase = batchesOnR2Count > 0 && batchesOnR2Count < totalBatches ? "PARTIAL_R2" : "GENERATING";
    message =
      batchesOnR2Count > 0
        ? `${batchesOnR2Count}/${totalBatches} batch di R2 — melanjutkan generate & unduh...`
        : "ZIP sedang dibuat di server...";
  } else if (cachedFlag && allOnR2) {
    phase = allDownloaded ? "FROZEN_DOWNLOADED" : "R2_COMPLETE";
    message = allDownloaded
      ? "Semua batch lengkap di R2 dan sudah pernah diunduh. Tidak perlu generate atau unduh ulang."
      : `${totalBatches} batch lengkap di R2. Siap diunduh (${batchesDownloadedCount}/${totalBatches} sudah pernah diunduh).`;
  } else if (batchesOnR2Count > 0 && batchesOnR2Count < totalBatches) {
    phase = "PARTIAL_R2";
    message = `${batchesOnR2Count}/${totalBatches} batch tersedia di R2. Melanjutkan sisa batch...`;
  } else if (batchesOnR2Count > 0) {
    phase = "R2_COMPLETE";
    message = `ZIP tersedia di R2 (${batchesDownloadedCount}/${totalBatches} sudah diunduh).`;
  }

  const frozen = phase === "FROZEN_DOWNLOADED";
  const canGenerate =
    !frozen &&
    !cachedFlag &&
    batchesOnR2Count === 0 &&
    jobStatus !== "PROCESSING" &&
    jobStatus !== "PENDING";
  const canDownload = !frozen;

  const status: ZipBundleStatus = {
    cacheKey,
    phase,
    frozen,
    canGenerate,
    canDownload,
    lockReason: frozen
      ? "Bundle lengkap dan sudah pernah diunduh"
      : cachedFlag
        ? "ZIP sudah tersimpan di cache server"
        : undefined,
    totalBatches,
    batchesOnR2Count,
    batchesDownloadedCount,
    totalFiles,
    jobId,
    jobStatus,
    progressPercent,
    cached: cachedFlag,
    frozenAt: bundleRow?.frozenAt?.toISOString() ?? (frozen ? new Date().toISOString() : null),
    allDownloadedAt:
      bundleRow?.allDownloadedAt?.toISOString() ??
      (allDownloaded ? new Date().toISOString() : null),
    message,
    batches,
    partialDownloads: batches.filter((b) => b.onR2),
  };

  if (phase === "FROZEN_DOWNLOADED" || allOnR2 || batchesOnR2Count > 0) {
    try {
      await syncZipBundleState(status);
    } catch {
      // non-fatal if table not migrated yet
    }
  }

  return status;
}

/** Record download audit (idempotent per cacheKey+r2Key) and re-sync bundle state. */
export async function recordZipDownloadAudit(params: {
  cacheKey: string;
  r2Key: string;
  batchIndex?: number;
  totalBatches?: number;
  downloadedByEmail?: string | null;
  itemCount?: number;
}): Promise<void> {
  const { cacheKey, r2Key, batchIndex, totalBatches, downloadedByEmail, itemCount } = params;

  const existing = await prisma.qrZipDownloadAudit.findFirst({
    where: { cacheKey, r2Key },
  });
  if (!existing) {
    await prisma.qrZipDownloadAudit.create({
      data: {
        cacheKey,
        r2Key,
        batchIndex: batchIndex ?? null,
        totalBatches: totalBatches ?? null,
        downloadedByEmail: downloadedByEmail ?? null,
      },
    });
  }

  await resolveZipBundleStatus({ cacheKey, itemCount });
}
