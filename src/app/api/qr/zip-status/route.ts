import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, BUCKET_NAME } from "@/lib/r2-client";

function r2KeyFromUrl(downloadUrl: string): string | null {
  try {
    const u = new URL(downloadUrl);
    return u.pathname.replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/qr/zip-status?cacheKey=...
 * Return existence status in R2 + audit download counts per batch.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cacheKey = searchParams.get("cacheKey");
  if (!cacheKey || cacheKey.trim() === "") {
    return NextResponse.json({ error: "Missing cacheKey" }, { status: 400 });
  }

  const cached = await prisma.qrZipDownloadCache.findUnique({ where: { cacheKey } });
  let result: any = cached?.result ?? null;
  if (!result) {
    const agg = await prisma.qrZipDownloadJob.aggregate({
      where: { cacheKey, status: "COMPLETED" },
      _max: { id: true },
    });
    const latestId = agg._max.id;
    const job = latestId ? await prisma.qrZipDownloadJob.findUnique({ where: { id: latestId } }) : null;
    result = job?.result ?? null;
  }

  const downloads = Array.isArray(result?.downloads) ? (result.downloads as any[]) : [];
  const items = downloads
    .map((d) => {
      const r2Key = (typeof d.r2Key === "string" && d.r2Key.trim() !== "" ? d.r2Key : null) ??
        (typeof d.download_url === "string" ? r2KeyFromUrl(d.download_url) : null);
      if (!r2Key) return null;
      return {
        batchIndex: Number(d.batchIndex ?? 0),
        totalBatches: Number(d.totalBatches ?? 0),
        r2Key,
      };
    })
    .filter(Boolean) as Array<{ batchIndex: number; totalBatches: number; r2Key: string }>;

  const existsByKey: Record<string, boolean | null> = {};
  await Promise.all(
    items.map(async (it) => {
      try {
        await r2Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: it.r2Key }));
        existsByKey[it.r2Key] = true;
      } catch (e: any) {
        // NotFound / 404 => false; other errors => null (unknown)
        const name = e?.name || "";
        const code = e?.$metadata?.httpStatusCode;
        if (name === "NotFound" || code === 404) existsByKey[it.r2Key] = false;
        else existsByKey[it.r2Key] = null;
      }
    })
  );

  const audit = await prisma.qrZipDownloadAudit.groupBy({
    by: ["r2Key"],
    where: { cacheKey, r2Key: { in: items.map((i) => i.r2Key) } },
    _count: { _all: true },
    _max: { downloadedAt: true },
  });
  const auditByKey: Record<string, { downloadedCount: number; lastDownloadedAt: Date | null }> = {};
  for (const a of audit) {
    auditByKey[a.r2Key] = {
      downloadedCount: (a as any)._count?._all ?? 0,
      lastDownloadedAt: (a as any)._max?.downloadedAt ?? null,
    };
  }

  const res = NextResponse.json({
    cacheKey,
    items: items.map((it) => ({
      ...it,
      exists: existsByKey[it.r2Key] ?? null,
      downloadedCount: auditByKey[it.r2Key]?.downloadedCount ?? 0,
      lastDownloadedAt: auditByKey[it.r2Key]?.lastDownloadedAt ?? null,
    })),
  });
  res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  return res;
}

