import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET    /api/gram-products/batch/[id]    -> get single batch with basic fields
// PATCH  /api/gram-products/batch/[id]    -> update batch metadata (currently: name only)
// DELETE /api/gram-products/batch/[id]    -> delete batch and all related items + scan logs

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });
  }

  try {
    // Check if request wants items with root keys (for QR preview modal)
    const url = new URL(request.url);
    const includeItems = url.searchParams.get("includeItems") === "true";

    if (includeItems) {
      // Return batch with all items including root keys (for QR preview modal)
      const batch = await prisma.gramProductBatch.findUnique({
        where: { id },
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
    } else {
      // Return basic batch info (existing behavior)
      const batch = await prisma.gramProductBatch.findUnique({
        where: { id },
      });

      if (!batch) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json(
        {
          batch: {
            id: batch.id,
            name: batch.name,
            weight: batch.weight,
            quantity: batch.quantity,
            qrMode: batch.qrMode,
            weightGroup: batch.weightGroup,
            createdAt: batch.createdAt,
          },
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error("[GramBatch GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to load batch", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const updated = await prisma.gramProductBatch.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(
      {
        batch: {
          id: updated.id,
          name: updated.name,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[GramBatch PATCH] Error updating batch:", error);
    return NextResponse.json(
      { error: "Failed to update batch", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });
  }

  try {
    // Find all items for this batch
    const items = await prisma.gramProductItem.findMany({
      where: { batchId: id },
      select: { id: true },
    });
    const itemIds = items.map((i) => i.id);

    await prisma.$transaction(async (tx) => {
      if (itemIds.length > 0) {
        await tx.gramQRScanLog.deleteMany({
          where: { qrItemId: { in: itemIds } },
        });
        await tx.gramProductItem.deleteMany({
          where: { id: { in: itemIds } },
        });
      }

      await tx.gramProductBatch.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[GramBatch DELETE] Error deleting batch:", error);
    return NextResponse.json(
      { error: "Failed to delete batch", details: error.message },
      { status: 500 }
    );
  }
}


