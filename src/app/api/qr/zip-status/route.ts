import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

function getR2Client() {
  const R2_ENDPOINT = process.env.R2_ENDPOINT;
  const R2_BUCKET = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;

  let normalizedR2Endpoint: string | null = null;
  if (R2_ENDPOINT) normalizedR2Endpoint = R2_ENDPOINT.replace(/\/[^/]+$/, "").replace(/\/$/, "");
  else if (R2_ACCOUNT_ID) normalizedR2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const ready =
    !!normalizedR2Endpoint && !!R2_BUCKET && !!R2_ACCESS_KEY_ID && !!R2_SECRET_ACCESS_KEY;
  if (!ready || !normalizedR2Endpoint) return null;

  const client = new S3Client({
    region: "auto",
    endpoint: normalizedR2Endpoint,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY! },
    forcePathStyle: true,
    maxAttempts: 2,
  });

  return { client, bucket: R2_BUCKET! };
}

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
    const job = await prisma.qrZipDownloadJob.findFirst({
      where: { cacheKey, status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
    });
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

  const r2 = getR2Client();
  const existsByKey: Record<string, boolean | null> = {};
  if (!r2) {
    for (const it of items) existsByKey[it.r2Key] = null;
  } else {
    await Promise.all(
      items.map(async (it) => {
        try {
          await r2.client.send(new HeadObjectCommand({ Bucket: r2.bucket, Key: it.r2Key }));
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
  }

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

