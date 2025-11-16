import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, getUserAgent } from "@/lib/request-info";

export async function GET(
  request: NextRequest,
  { params }: { params: { serialCode: string } }
) {
  const serial = params.serialCode?.trim().toUpperCase();

  if (!serial) {
    return NextResponse.json(
      { verified: false, error: "Serial code missing" },
      { status: 400 }
    );
  }

  const qrRecord = await prisma.qrRecord.findUnique({
    where: { serialCode: serial },
    include: { product: true },
  });

  if (!qrRecord || !qrRecord.product) {
    return NextResponse.json(
      { verified: false, error: "Serial code not recognized" },
      { status: 404 }
    );
  }

  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  await prisma.$transaction([
    prisma.qrRecord.update({
      where: { id: qrRecord.id },
      data: {
        scanCount: { increment: 1 },
        lastScannedAt: new Date(),
      },
    }),
    prisma.qRScanLog.create({
      data: {
        qrRecordId: qrRecord.id,
        ip: ip ?? undefined,
        userAgent: userAgent ?? undefined,
      },
    }),
  ]);

  return NextResponse.json({
    verified: true,
    product: {
      id: qrRecord.product.id,
      name: qrRecord.product.name,
      weight: qrRecord.product.weight,
      serialCode: qrRecord.serialCode,
      price: qrRecord.product.price,
      stock: qrRecord.product.stock,
      qrImageUrl: qrRecord.qrImageUrl,
      createdAt: qrRecord.product.createdAt,
    },
    scanCount: qrRecord.scanCount + 1,
  });
}

