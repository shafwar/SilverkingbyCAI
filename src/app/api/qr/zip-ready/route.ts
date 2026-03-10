import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function buildGramBatchCacheKey(batchId: number, templateVariant: string, useCustom: boolean) {
  const gram = 1;
  return `gram-batch:${batchId}:tpl:${templateVariant}:custom:${useCustom ? 1 : 0}:gram:${gram}`;
}

/**
 * GET /api/qr/zip-ready?batchId=...&templateVariant=...&useCustom=0|1
 * Cek apakah ZIP untuk gram batch + template tertentu sudah siap (cached) di R2.
 * Jika sudah, return result yang sama seperti /download-multiple-pdf (success, downloads[], total_files, ...).
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const batchIdStr = searchParams.get("batchId");
  const templateVariant = searchParams.get("templateVariant") ?? "01";
  const useCustom = searchParams.get("useCustom") === "1";

  const batchId = batchIdStr ? Number(batchIdStr) : NaN;
  if (!Number.isFinite(batchId) || batchId <= 0) {
    return NextResponse.json({ error: "Invalid batchId" }, { status: 400 });
  }

  const cacheKey = buildGramBatchCacheKey(batchId, templateVariant, useCustom);

  // 1) Cek cache formal
  const cached = await prisma.qrZipDownloadCache.findUnique({ where: { cacheKey } });
  if (cached) {
    return NextResponse.json({
      success: true,
      cached: true,
      cacheKey,
      ...(cached.result as any),
    });
  }

  // 2) Fallback: mungkin ada job lama yang sudah COMPLETED tapi cache belum terisi
  const completedJob = await prisma.qrZipDownloadJob.findFirst({
    where: { cacheKey, status: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
  });
  if (completedJob?.result) {
    await prisma.qrZipDownloadCache.upsert({
      where: { cacheKey },
      update: {
        result: completedJob.result as any,
        lastAccessedAt: new Date(),
        hitCount: { increment: 1 },
      },
      create: {
        cacheKey,
        result: completedJob.result as any,
        lastAccessedAt: new Date(),
        hitCount: 1,
      },
    });
    return NextResponse.json({
      success: true,
      cached: true,
      cacheKey,
      ...(completedJob.result as any),
    });
  }

  // 3) Kalau ada job tapi belum selesai -> kasih status agar UI bisa tahu masih diproses
  const pendingJob = await prisma.qrZipDownloadJob.findFirst({
    where: { cacheKey },
    orderBy: { createdAt: "desc" },
  });
  if (pendingJob) {
    return NextResponse.json({
      success: false,
      cached: false,
      cacheKey,
      status: pendingJob.status,
      message: "ZIP masih diproses untuk batch ini.",
    });
  }

  return NextResponse.json({
    success: false,
    cached: false,
    cacheKey,
    status: "NOT_FOUND",
    message: "Belum ada ZIP yang dihasilkan untuk batch ini.",
  });
}

