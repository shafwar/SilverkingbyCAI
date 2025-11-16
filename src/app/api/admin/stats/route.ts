import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [totalProducts, totalQrCodes, totalScansAggregate, scansToday] = await Promise.all([
    prisma.product.count(),
    prisma.qrRecord.count(),
    prisma.qrRecord.aggregate({ _sum: { scanCount: true } }),
    prisma.qRScanLog.count({ where: { scannedAt: { gte: startOfDay } } }),
  ]);

  return NextResponse.json({
    totalProducts,
    totalQrCodes,
    totalScans: totalScansAggregate._sum.scanCount ?? 0,
    scansToday,
  });
}


