import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all gram product item IDs and batch IDs
    const items = await prisma.gramProductItem.findMany({
      select: { id: true, batchId: true },
    });
    const itemIds = items.map((i) => i.id);
    const batchIds = Array.from(new Set(items.map((i) => i.batchId)));

    await prisma.$transaction(async (tx) => {
      if (itemIds.length > 0) {
        await tx.gramQRScanLog.deleteMany({
          where: { qrItemId: { in: itemIds } },
        });
        await tx.gramProductItem.deleteMany({
          where: { id: { in: itemIds } },
        });
      }

      // Delete remaining batches (including ones with zero items, if any)
      await tx.gramProductBatch.deleteMany({});
    });

    return NextResponse.json(
      { success: true, deletedBatches: batchIds.length, deletedItems: itemIds.length },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[GramProducts DELETE-ALL] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete all gram products", details: error?.message },
      { status: 500 }
    );
  }
}


