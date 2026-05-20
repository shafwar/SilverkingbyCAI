import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/r2-client";
import { extractR2KeysFromZipCachedResult } from "@/lib/qr-zip-result-r2-keys";

/** Varian cacheKey gram (legacy tanpa :rk: + dengan rk 0/1) agar purge selaras dengan zip-ready / download-multiple-pdf. */
function expandGramZipCacheKeysForPurge(cacheKey: string): string[] {
  const out = new Set<string>([cacheKey]);
  if (!cacheKey.startsWith("gram-batch:")) return Array.from(out);
  const base = cacheKey.replace(/:rk:[01]$/, "");
  out.add(base);
  out.add(`${base}:rk:0`);
  out.add(`${base}:rk:1`);
  return Array.from(out);
}

/**
 * POST /api/qr/zip-storage-purge
 * Admin: hapus objek ZIP di R2 + baris cache/job/audit untuk signature ZIP ini.
 * Body: { cacheKey: string }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { cacheKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cacheKeyRaw = body?.cacheKey;
  const cacheKey = typeof cacheKeyRaw === "string" ? cacheKeyRaw.trim() : "";
  if (!cacheKey) {
    return NextResponse.json({ error: "Missing cacheKey" }, { status: 400 });
  }

  if (
    !cacheKey.startsWith("gram-batch:") &&
    !cacheKey.startsWith("serials:")
  ) {
    return NextResponse.json({ error: "Unsupported cacheKey prefix" }, { status: 400 });
  }

  const keysToClearDb = expandGramZipCacheKeysForPurge(cacheKey);

  const [caches, jobs] = await Promise.all([
    prisma.qrZipDownloadCache.findMany({ where: { cacheKey: { in: keysToClearDb } } }),
    prisma.qrZipDownloadJob.findMany({ where: { cacheKey: { in: keysToClearDb } } }),
  ]);

  if (caches.length === 0 && jobs.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "Tidak ada cache atau job ZIP untuk kunci ini (mungkin sudah dihapus).",
        cacheKeysTried: keysToClearDb,
      },
      { status: 404 }
    );
  }

  const r2Keys = new Set<string>();
  for (const c of caches) {
    for (const k of extractR2KeysFromZipCachedResult(c.result)) r2Keys.add(k);
  }
  for (const j of jobs) {
    if (j.result != null) {
      for (const k of extractR2KeysFromZipCachedResult(j.result)) r2Keys.add(k);
    }
  }

  await prisma.$transaction([
    prisma.qrZipDownloadAudit.deleteMany({ where: { cacheKey: { in: keysToClearDb } } }),
    prisma.qrZipDownloadCache.deleteMany({ where: { cacheKey: { in: keysToClearDb } } }),
    prisma.qrZipDownloadJob.deleteMany({ where: { cacheKey: { in: keysToClearDb } } }),
  ]);

  const r2List = Array.from(r2Keys);
  const r2Errors: string[] = [];
  for (const key of r2List) {
    try {
      await deleteFromR2(key);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[zip-storage-purge] R2 delete failed:", key, msg);
      r2Errors.push(`${key}: ${msg}`);
    }
  }

  const res = NextResponse.json({
    ok: true,
    message: "Riwayat ZIP di server dikosongkan; file di R2 dihapus sesuai metadata.",
    cacheKeysCleared: keysToClearDb.length,
    dbCachesRemoved: caches.length,
    dbJobsRemoved: jobs.length,
    r2KeysAttempted: r2List.length,
    r2DeleteErrors: r2Errors.length > 0 ? r2Errors : undefined,
  });
  res.headers.set("Cache-Control", "private, no-store, max-age=0");
  return res;
}
