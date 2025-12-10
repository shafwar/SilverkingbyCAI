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

  const historyId = Number(params.id);
  if (Number.isNaN(historyId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const history = await prisma.productDeleteHistory.findUnique({
    where: { id: historyId },
  });

  if (!history) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (history.restoredAt) {
    return NextResponse.json(
      { error: "Already restored" },
      { status: 409 }
    );
  }

  const existing = await prisma.product.findUnique({
    where: { serialCode: history.serialCode },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Serial already in use" },
      { status: 409 }
    );
  }

  // Generate new QR asset so we don't rely on deleted storage objects
  const verifyUrl = getVerifyUrl(history.serialCode);
  let qrResult: { url: string } | null = null;
  try {
    qrResult = await generateAndStoreQR(history.serialCode, verifyUrl, history.name);
  } catch (error: any) {
    console.error("Failed to regenerate QR asset during restore:", error);
    return NextResponse.json(
      { error: "Failed to regenerate QR asset", message: error?.message },
      { status: 500 }
    );
  }

  try {
    const restored = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: history.name,
          weight: history.weight,
          serialCode: history.serialCode,
          price: history.price ?? undefined,
          stock: history.stock ?? undefined,
        },
      });

      await tx.qrRecord.create({
        data: {
          productId: product.id,
          serialCode: history.serialCode,
          qrImageUrl: qrResult?.url ?? "",
          scanCount: history.scanCount ?? 0,
        },
      });

      const updatedHistory = await tx.productDeleteHistory.update({
        where: { id: history.id },
        data: {
          restoredAt: new Date(),
          restoredProductId: product.id,
        },
      });

      return { product, history: updatedHistory };
    });

    return NextResponse.json({ success: true, product: restored.product });
  } catch (error: any) {
    // Clean up orphaned QR asset if DB transaction failed
    if (qrResult?.url) {
      await deleteQrAsset(history.serialCode, qrResult.url).catch(() => {
        // swallow error
      });
    }

    console.error("Failed to restore product from history:", error);
    return NextResponse.json(
      { error: "Failed to restore product", message: error?.message },
      { status: 500 }
    );
  }
}

