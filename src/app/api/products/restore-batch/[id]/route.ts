import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAndStoreQR, deleteQrAsset } from "@/lib/qr";
import { getVerifyUrl } from "@/utils/constants";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchId = Number(params.id);
  if (Number.isNaN(batchId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const batch = await prisma.productDeleteBatch.findUnique({
    where: { id: batchId },
    include: { histories: true },
  });

  if (!batch) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const histories = batch.histories.filter((h) => !h.restoredAt);
  if (histories.length === 0) {
    return NextResponse.json({ error: "Already restored" }, { status: 409 });
  }

  // Pre-flight: check serial conflicts
  const serials = histories.map((h) => h.serialCode);
  const conflicting = await prisma.product.findMany({
    where: { serialCode: { in: serials } },
    select: { serialCode: true },
  });
  if (conflicting.length > 0) {
    return NextResponse.json(
      { error: "Serial already in use", conflicts: conflicting.map((c) => c.serialCode) },
      { status: 409 }
    );
  }

  // Generate QR assets upfront
  const qrResults: Record<number, string> = {};
  try {
    for (const item of histories) {
      const verifyUrl = getVerifyUrl(item.serialCode);
      const qr = await generateAndStoreQR(item.serialCode, verifyUrl, item.name);
      qrResults[item.id] = qr.url;
    }
  } catch (error: any) {
    console.error("Failed to regenerate QR asset during batch restore:", error);
    return NextResponse.json(
      { error: "Failed to regenerate QR asset", message: error?.message },
      { status: 500 }
    );
  }

  try {
    const restored = await prisma.$transaction(async (tx) => {
      const createdProducts = [];
      for (const item of histories) {
        const product = await tx.product.create({
          data: {
            name: item.name,
            weight: item.weight,
            serialCode: item.serialCode,
            price: item.price ?? undefined,
            stock: item.stock ?? undefined,
          },
        });
        createdProducts.push(product);

        await tx.qrRecord.create({
          data: {
            productId: product.id,
            serialCode: item.serialCode,
            qrImageUrl: qrResults[item.id] ?? "",
            scanCount: item.scanCount ?? 0,
          },
        });

        await tx.productDeleteHistory.update({
          where: { id: item.id },
          data: {
            restoredAt: new Date(),
            restoredProductId: product.id,
          },
        });
      }

      return createdProducts;
    });

    return NextResponse.json({ success: true, restoredCount: restored.length });
  } catch (error: any) {
    // Clean up orphaned QR assets
    await Promise.all(
      Object.entries(qrResults).map(([_, url]) =>
        deleteQrAsset("", url).catch(() => {})
      )
    );

    console.error("Failed to restore batch:", error);
    return NextResponse.json(
      { error: "Failed to restore batch", message: error?.message },
      { status: 500 }
    );
  }
}

