import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const days = Number(body?.days ?? process.env.PRODUCT_DELETE_HISTORY_RETENTION_DAYS ?? 30);

  if (Number.isNaN(days) || days <= 0) {
    return NextResponse.json({ error: "Invalid retention days" }, { status: 400 });
  }

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await prisma.$transaction(async (tx) => {
    const history = await tx.productDeleteHistory.deleteMany({
      where: { deletedAt: { lt: cutoff } },
    });
    const batches = await tx.productDeleteBatch.deleteMany({
      where: { deletedAt: { lt: cutoff } },
    });
    return { history, batches };
  });

  return NextResponse.json({
    success: true,
    deletedCount: result.history.count,
    deletedBatches: result.batches.count,
  });
}

