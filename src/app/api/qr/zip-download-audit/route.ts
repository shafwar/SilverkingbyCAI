import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recordZipDownloadAudit } from "@/lib/zip-bundle-status";

/**
 * POST /api/qr/zip-download-audit
 * Catat unduhan berhasil (idempotent per cacheKey+r2Key) dan sync bundle state.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> | null = null;
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

  const batchIndex = body?.batchIndex != null ? Number(body.batchIndex) : undefined;
  const totalBatches = body?.totalBatches != null ? Number(body.totalBatches) : undefined;
  const itemCount = body?.itemCount != null ? Number(body.itemCount) : undefined;
  const downloadedByEmail = (session.user as { email?: string })?.email ?? null;

  await recordZipDownloadAudit({
    cacheKey,
    r2Key,
    batchIndex: Number.isFinite(batchIndex) ? batchIndex : undefined,
    totalBatches: Number.isFinite(totalBatches) ? totalBatches : undefined,
    downloadedByEmail,
    itemCount: Number.isFinite(itemCount) ? itemCount : undefined,
  });

  return NextResponse.json({ success: true });
}
