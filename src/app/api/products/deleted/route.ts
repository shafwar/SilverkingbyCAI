import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(parseInt(limitParam || "50", 10) || 50, 200);
  const retentionDays = Number(process.env.PRODUCT_DELETE_HISTORY_RETENTION_DAYS ?? 30);

  // Auto-clean old history to save storage
  if (!Number.isNaN(retentionDays) && retentionDays > 0) {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    await prisma.$transaction(async (tx) => {
      await tx.productDeleteHistory.deleteMany({
        where: { deletedAt: { lt: cutoff } },
      });
      await tx.productDeleteBatch.deleteMany({
        where: { deletedAt: { lt: cutoff } },
      });
    });
  }

  const batches = await prisma.productDeleteBatch.findMany({
    orderBy: { deletedAt: "desc" },
    take: limit,
    include: {
      histories: {
        orderBy: { deletedAt: "desc" },
      },
    },
  });

  return NextResponse.json({ batches });
}

