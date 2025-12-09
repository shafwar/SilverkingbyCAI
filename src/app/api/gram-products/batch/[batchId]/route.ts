import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/gram-products/batch/[batchId]
 *
 * Get all items in a batch with their root keys (for admin display)
 * This endpoint is used to display all serial codes and root keys in a batch
 */
export async function GET(request: NextRequest, { params }: { params: { batchId: string } }) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const batchId = parseInt(params.batchId);

    if (isNaN(batchId)) {
      return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
    }

    // Get batch with all items
    const batch = await prisma.gramProductBatch.findUnique({
      where: { id: batchId },
      include: {
        items: {
          orderBy: { serialCode: "asc" },
          select: {
            id: true,
            uniqCode: true,
            serialCode: true,
            qrImageUrl: true,
            rootKey: true, // Plain text root key for admin display
            createdAt: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json({
      batch: {
        id: batch.id,
        name: batch.name,
        weight: batch.weight,
        quantity: batch.quantity,
        createdAt: batch.createdAt,
      },
      items: batch.items.map((item) => ({
        id: item.id,
        uniqCode: item.uniqCode,
        serialCode: item.serialCode,
        qrImageUrl: item.qrImageUrl,
        rootKey: item.rootKey || null, // Plain text root key
        createdAt: item.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("[GramProductBatch] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
