import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getObjectStreamFromR2 } from "@/lib/r2-client";
import { resolveZipFileFromJobResult } from "@/lib/zip-job-file-resolve";

/**
 * GET /api/qr/zip-file?jobId=123&batchIndex=1 (optional)
 * Same-origin ZIP download proxy — avoids CORS / browser auto-download blocks on R2 URLs.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobIdRaw = searchParams.get("jobId");
    const batchIndexRaw = searchParams.get("batchIndex");
    const jobId = jobIdRaw ? Math.floor(Number(jobIdRaw)) : NaN;
    if (!Number.isFinite(jobId) || jobId < 1) {
      return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
    }

    const batchIndex =
      batchIndexRaw != null && batchIndexRaw !== ""
        ? Math.floor(Number(batchIndexRaw))
        : undefined;
    if (batchIndexRaw != null && batchIndexRaw !== "" && (!Number.isFinite(batchIndex!) || batchIndex! < 1)) {
      return NextResponse.json({ error: "Invalid batchIndex" }, { status: 400 });
    }

    const job = await prisma.qrZipDownloadJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const resolved = resolveZipFileFromJobResult(
      job.result as Record<string, unknown> | null,
      batchIndex
    );
    if (!resolved?.r2Key) {
      return NextResponse.json({ error: "ZIP file reference not found in job" }, { status: 404 });
    }

    if (job.status !== "COMPLETED") {
      const partial = job.result as {
        downloads?: Array<{ batchIndex?: number; r2Key?: string }>;
      } | null;
      const batchReady =
        Array.isArray(partial?.downloads) &&
        partial!.downloads!.some((d) => {
          const idx = Number(d.batchIndex);
          const key = typeof d.r2Key === "string" ? d.r2Key : "";
          if (batchIndex != null) {
            return idx === batchIndex && key === resolved.r2Key;
          }
          return key === resolved.r2Key;
        });
      if (!batchReady) {
        return NextResponse.json(
          { error: "ZIP batch belum tersedia di server", status: job.status },
          { status: 409 }
        );
      }
    }

    const streamResult = await getObjectStreamFromR2(resolved.r2Key);
    if (!streamResult?.body) {
      return NextResponse.json({ error: "ZIP file missing in storage" }, { status: 404 });
    }

    const webStream = Readable.toWeb(streamResult.body) as ReadableStream;
    const safeFilename = resolved.filename.replace(/[^\w.\-()+ ]/g, "_") || "serticard-batch.zip";

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (e) {
    console.error("[qr/zip-file] GET error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Failed to stream ZIP file" }, { status: 500 });
  }
}
