import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gramBatchZipCacheKeyCandidates } from "@/lib/qr-zip-gram-cache-keys";
import {
  findLatestCompletedZipJobForGramKeys,
  findLatestZipJobForGramKeys,
} from "@/lib/qr-zip-job-gram-lookup";

/**
 * GET /api/qr/zip-ready?batchId=...&templateVariant=...&useCustom=0|1&cmsTemplateId=optional
 * Cek apakah ZIP untuk gram batch + template tertentu sudah siap (cached) di R2.
 * Jika sudah, return result yang sama seperti /download-multiple-pdf (success, downloads[], total_files, ...).
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
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

  // 1) Cek cache formal (semua varian kunci gram + rootkey flag) — max few rows; pick newest in JS (no heavy DB sort)
  const cacheRows = await prisma.qrZipDownloadCache.findMany({
    where: { cacheKey: { in: cacheKeyCandidates } },
  });
  const cached =
    cacheRows.length === 0
      ? null
      : cacheRows.reduce((best, r) => (!best || r.updatedAt > best.updatedAt ? r : best));
  if (cached) {
    return noCacheJson({
      success: true,
      cached: true,
      cacheKey: cached.cacheKey,
      ...(cached.result as any),
    });
  }

  // 2) Fallback: mungkin ada job lama yang sudah COMPLETED tapi cache belum terisi (per-key queries → no IN+sort on huge job history)
  const completedJob = await findLatestCompletedZipJobForGramKeys(cacheKeyCandidates);
  if (completedJob?.result) {
    const resolvedKey = completedJob.cacheKey ?? defaultCacheKey;
    await prisma.qrZipDownloadCache.upsert({
      where: { cacheKey: resolvedKey },
      update: {
        result: completedJob.result as any,
        lastAccessedAt: new Date(),
        hitCount: { increment: 1 },
      },
      create: {
        cacheKey: resolvedKey,
        result: completedJob.result as any,
        lastAccessedAt: new Date(),
        hitCount: 1,
      },
    });
    return noCacheJson({
      success: true,
      cached: true,
      cacheKey: resolvedKey,
      ...(completedJob.result as any),
    });
  }

  // 3) Kalau ada job tapi belum selesai -> kasih status agar UI bisa tahu masih diproses
  const pendingJob = await findLatestZipJobForGramKeys(cacheKeyCandidates);
  if (pendingJob) {
    return noCacheJson({
      success: false,
      cached: false,
      cacheKey: pendingJob.cacheKey ?? defaultCacheKey,
      status: pendingJob.status,
      message: "ZIP masih diproses untuk batch ini.",
    });
  }

  return noCacheJson({
    success: false,
    cached: false,
    cacheKey: defaultCacheKey,
    status: "NOT_FOUND",
    message: "Belum ada ZIP yang dihasilkan untuk batch ini.",
  });
}

