import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gramBatchZipCacheKeyCandidates } from "@/lib/qr-zip-gram-cache-keys";
import {
  findLatestCompletedZipJobForGramKeys,
  findLatestZipJobForGramKeys,
} from "@/lib/qr-zip-job-gram-lookup";
import { resolveZipBundleStatus } from "@/lib/zip-bundle-status";
import { isChunkedZipResult } from "@/lib/serticard-zip-result";

/**
 * GET /api/qr/zip-ready?batchId=...&templateVariant=...&useCustom=0|1&cmsTemplateId=optional&itemCount=optional
 * Cek status bundle ZIP: R2, unduhan, freeze lock, partial resume.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    const u = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    u.headers.set("Cache-Control", "private, no-store, max-age=0");
    return u;
  }

  const { searchParams } = new URL(request.url);
  const batchIdStr = searchParams.get("batchId");
  const templateVariant = searchParams.get("templateVariant") ?? "01";
  const useCustom = searchParams.get("useCustom") === "1";
  const cmsRaw = searchParams.get("cmsTemplateId");
  const cmsParsed = cmsRaw != null && cmsRaw !== "" ? Math.floor(Number(cmsRaw)) : 0;
  const cmsTemplateId =
    Number.isFinite(cmsParsed) && cmsParsed > 0 ? cmsParsed : 0;
  const itemCountRaw = searchParams.get("itemCount");
  const itemCount =
    itemCountRaw != null && Number.isFinite(Number(itemCountRaw))
      ? Math.floor(Number(itemCountRaw))
      : 0;

  const batchId = batchIdStr ? Number(batchIdStr) : NaN;
  if (!Number.isFinite(batchId) || batchId <= 0) {
    const inv = NextResponse.json({ error: "Invalid batchId" }, { status: 400 });
    inv.headers.set("Cache-Control", "private, no-store, max-age=0");
    return inv;
  }

  const cacheKeyCandidates = gramBatchZipCacheKeyCandidates(
    batchId,
    templateVariant,
    useCustom,
    cmsTemplateId
  );
  const defaultCacheKey = cacheKeyCandidates[0]!;
  const noCacheJson = (body: Record<string, unknown>, status = 200) => {
    const res = NextResponse.json(body, { status });
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return res;
  };

  let resolvedCacheKey = defaultCacheKey;
  let resultPayload: Record<string, unknown> | null = null;
  let cached = false;
  let jobId: number | null = null;

  const cacheRows = await prisma.qrZipDownloadCache.findMany({
    where: { cacheKey: { in: cacheKeyCandidates } },
  });
  const cachedRow =
    cacheRows.length === 0
      ? null
      : cacheRows.reduce((best, r) => (!best || r.updatedAt > best.updatedAt ? r : best));

  if (cachedRow) {
    resolvedCacheKey = cachedRow.cacheKey;
    cached = true;
    resultPayload = cachedRow.result as Record<string, unknown>;
    const jobForCache = await findLatestZipJobForGramKeys([cachedRow.cacheKey]);
    jobId = jobForCache?.id ?? null;
  } else {
    const completedJob = await findLatestCompletedZipJobForGramKeys(cacheKeyCandidates);
    if (completedJob?.result) {
      resolvedCacheKey = completedJob.cacheKey ?? defaultCacheKey;
      cached = true;
      resultPayload = completedJob.result as Record<string, unknown>;
      jobId = completedJob.id;
      await prisma.qrZipDownloadCache.upsert({
        where: { cacheKey: resolvedCacheKey },
        update: {
          result: completedJob.result as any,
          lastAccessedAt: new Date(),
          hitCount: { increment: 1 },
        },
        create: {
          cacheKey: resolvedCacheKey,
          result: completedJob.result as any,
          lastAccessedAt: new Date(),
          hitCount: 1,
        },
      });
    } else {
      const pendingJob = await findLatestZipJobForGramKeys(cacheKeyCandidates);
      if (pendingJob) {
        resolvedCacheKey = pendingJob.cacheKey ?? defaultCacheKey;
        jobId = pendingJob.id;
        if (pendingJob.result) {
          resultPayload = pendingJob.result as Record<string, unknown>;
        }
      }
    }
  }

  const bundle = await resolveZipBundleStatus({
    cacheKey: resolvedCacheKey,
    itemCount,
  });

  if (bundle.frozen) {
    return noCacheJson({
      success: true,
      cached: true,
      frozen: true,
      cacheKey: resolvedCacheKey,
      jobId: bundle.jobId ?? jobId,
      bundle,
      ...(resultPayload ?? {}),
      message: bundle.message,
    });
  }

  if (cached && resultPayload) {
    return noCacheJson({
      success: true,
      cached: true,
      frozen: false,
      cacheKey: resolvedCacheKey,
      jobId: bundle.jobId ?? jobId,
      bundle,
      ...resultPayload,
    });
  }

  const pendingJob = await findLatestZipJobForGramKeys(cacheKeyCandidates);
  if (
    pendingJob &&
    (pendingJob.status === "PENDING" || pendingJob.status === "PROCESSING")
  ) {
    const partialResult = pendingJob.result as Record<string, unknown> | null;
    const downloads = partialResult?.downloads;
    return noCacheJson({
      success: partialResult ? true : false,
      cached: false,
      frozen: false,
      cacheKey: pendingJob.cacheKey ?? defaultCacheKey,
      jobId: pendingJob.id,
      status: pendingJob.status,
      progressPercent: pendingJob.progressPercent ?? 0,
      bundle,
      ...(partialResult ?? {}),
      ...(Array.isArray(downloads) && downloads.length > 0
        ? { downloads, chunked: isChunkedZipResult(partialResult) }
        : {}),
      message: bundle.message,
      resumable: bundle.phase === "PARTIAL_R2",
    });
  }

  if (pendingJob?.status === "FAILED" && pendingJob.result) {
    const partialResult = pendingJob.result as Record<string, unknown>;
    return noCacheJson({
      success: false,
      cached: false,
      frozen: false,
      cacheKey: pendingJob.cacheKey ?? defaultCacheKey,
      jobId: pendingJob.id,
      status: "FAILED",
      bundle,
      ...partialResult,
      message: bundle.message,
      resumable: bundle.phase === "PARTIAL_R2",
    });
  }

  return noCacheJson({
    success: false,
    cached: false,
    frozen: false,
    cacheKey: defaultCacheKey,
    status: "NOT_FOUND",
    bundle,
    message: bundle.message,
  });
}
