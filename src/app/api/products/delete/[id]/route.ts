import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteQrAsset } from "@/lib/qr";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletedBy = (session.user as any)?.email as string | undefined;
  const id = Number(params.id);

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: { qrRecord: { include: { scanLogs: true } } },
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    const batch = await tx.productDeleteBatch.create({
      data: {
        deletedBy: deletedBy ?? null,
        itemCount: 1,
      },
    });

    await tx.productDeleteHistory.create({
      data: {
        productId: product.id,
        name: product.name,
        weight: product.weight,
        serialCode: product.serialCode,
        price: product.price,
        stock: product.stock,
        qrImageUrl: product.qrRecord?.qrImageUrl,
        scanCount:
          product.qrRecord?.scanCount ??
          product.qrRecord?.scanLogs?.length ??
          0,
        deletedBy: deletedBy ?? null,
        batchId: batch.id,
      },
    });

    if (product.qrRecord) {
      await tx.qRScanLog.deleteMany({ where: { qrRecordId: product.qrRecord.id } });
      await tx.qrRecord.delete({ where: { id: product.qrRecord.id } });
    }
    await tx.product.delete({ where: { id: product.id } });
  });

  if (product.qrRecord) {
    await deleteQrAsset(product.qrRecord.serialCode, product.qrRecord.qrImageUrl);
  }

  return NextResponse.json({ success: true });
}

