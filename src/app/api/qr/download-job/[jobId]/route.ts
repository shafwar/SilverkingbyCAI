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
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;
  const id = parseInt(jobId, 10);
  if (Number.isNaN(id) || id < 1) {
    return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
  }

  const job = await prisma.qrZipDownloadJob.findUnique({
    where: { id },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const result = job.result as Record<string, unknown> | null;
  const payload: {
    jobId: number;
    status: string;
    result?: Record<string, unknown>;
    errorMessage?: string | null;
    createdAt: Date;
    updatedAt: Date;
  } = {
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };

  if (job.status === "COMPLETED" && result) {
    payload.result = result;
    // Frontend expects success, product_title, product_id, rootkey, total_files, download_url
    payload.result.success = true;
  }
  if (job.status === "FAILED" && job.errorMessage) {
    payload.errorMessage = job.errorMessage;
  }

  return NextResponse.json(payload);
}
