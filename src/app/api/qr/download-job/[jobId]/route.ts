import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/qr/download-job/[jobId]
 * Poll status untuk background ZIP job. Return status + result ketika COMPLETED.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { jobId } = await params;
    const id = parseInt(jobId, 10);
    if (Number.isNaN(id) || id < 1) {
      return NextResponse.json(
        { error: "Invalid jobId", code: "INVALID_ID" },
        { status: 400 }
      );
    }

    const job = await prisma.qrZipDownloadJob.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const result = job.result as Record<string, unknown> | null;
    const payload: {
    jobId: number;
    status: string;
    result?: Record<string, unknown>;
    errorMessage?: string | null;
    progressPercent?: number;
    progressMessage?: string | null;
    cacheKey?: string | null;
    createdAt: Date;
    updatedAt: Date;
  } = {
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
  payload.cacheKey = (job as any).cacheKey ?? null;

  if (job.status === "COMPLETED") {
    payload.progressPercent = 100;
    payload.progressMessage =
      job.progressMessage?.trim() || "ZIP selesai. Mengunduh ke perangkat Anda...";
  } else if (job.status === "FAILED") {
    payload.progressPercent = job.progressPercent ?? 0;
    payload.progressMessage = job.errorMessage || job.progressMessage || "Pembuatan ZIP gagal.";
  } else {
    payload.progressPercent = job.progressPercent ?? 0;
    payload.progressMessage = job.progressMessage ?? null;
  }

  // Partial result while PROCESSING (chunked batches) or final result when COMPLETED
  if (result && typeof result === "object") {
    const hasDownloads = Array.isArray((result as any).downloads);
    const hasDirectUrl =
      typeof (result as any).download_url === "string" ||
      typeof (result as any).downloadUrl === "string";
    if (hasDownloads || hasDirectUrl || job.status === "COMPLETED") {
      payload.result = result as Record<string, unknown>;
      (payload.result as any).success = (result as any).success ?? true;
    }
  }

  if (job.status === "FAILED" && job.errorMessage) {
    payload.errorMessage = job.errorMessage;
  }

  return NextResponse.json(payload);
  } catch (e: any) {
    console.error("[qr/download-job] GET error:", e?.message ?? e);
    const code = e?.code === "P2021" ? "SCHEMA" : "SERVER_ERROR";
    return NextResponse.json(
      {
        error: code === "SCHEMA" ? "Database schema outdated (run migrations)" : "Server error",
        code,
      },
      { status: 500 }
    );
  }
}
