import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/qr/zip-download-audit
 * Catat bahwa admin menekan tombol download (audit).
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cacheKey = typeof body?.cacheKey === "string" ? body.cacheKey.trim() : "";
  const r2Key = typeof body?.r2Key === "string" ? body.r2Key.trim() : "";
  if (!cacheKey || !r2Key) {
    return NextResponse.json({ error: "Missing cacheKey or r2Key" }, { status: 400 });
  }

  const batchIndex = body?.batchIndex != null ? Number(body.batchIndex) : null;
  const totalBatches = body?.totalBatches != null ? Number(body.totalBatches) : null;
  const downloadedByEmail = (session.user as any)?.email ?? null;

  await prisma.qrZipDownloadAudit.create({
    data: {
      cacheKey,
      r2Key,
      batchIndex: Number.isFinite(batchIndex as any) ? (batchIndex as any) : null,
      totalBatches: Number.isFinite(totalBatches as any) ? (totalBatches as any) : null,
      downloadedByEmail,
    },
  });

  return NextResponse.json({ success: true });
}

