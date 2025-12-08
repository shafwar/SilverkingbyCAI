import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      totalQrCodes,
      totalScansAggregate,
      scansToday,
      totalGramBatches,
      totalGramItems,
      totalGramScansAggregate,
      gramScansToday,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.qrRecord.count(),
      prisma.qrRecord.aggregate({ _sum: { scanCount: true } }),
      prisma.qRScanLog.count({ where: { scannedAt: { gte: startOfDay } } }),
      prisma.gramProductBatch.count(),
      prisma.gramProductItem.count(),
      prisma.gramProductItem.aggregate({ _sum: { scanCount: true } }),
      prisma.gramQRScanLog.count({ where: { scannedAt: { gte: startOfDay } } }),
    ]);

    const page1TotalScans = totalScansAggregate._sum.scanCount ?? 0;
    const page2TotalScans = totalGramScansAggregate._sum.scanCount ?? 0;

    return NextResponse.json({
      totalProducts,
      totalQrCodes,
      totalScans: page1TotalScans,
      scansToday,
      // Page 2 (Gram) data
      gramBatches: totalGramBatches,
      gramItems: totalGramItems,
      gramTotalScans: page2TotalScans,
      gramScansToday,
      // Combined totals
      combinedTotalProducts: totalProducts + totalGramBatches,
      combinedTotalQrCodes: totalQrCodes + totalGramItems,
      combinedTotalScans: page1TotalScans + page2TotalScans,
      combinedScansToday: scansToday + gramScansToday,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}


