import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const start7d = new Date(now);
    start7d.setDate(now.getDate() - 6);
    start7d.setHours(0, 0, 0, 0);

    const start30d = new Date(now);
    start30d.setDate(now.getDate() - 29);
    start30d.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const [
      totalProducts,
      totalQrCodes,
      totalScansAggregate,
      scansToday,
      scansLast7Days,
      scansLast30Days,
      scansThisMonth,
      totalGramBatches,
      totalGramItems,
      totalGramScansAggregate,
      gramScansToday,
      gramScansLast7Days,
      gramScansLast30Days,
      gramScansThisMonth,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.qrRecord.count(),
      prisma.qrRecord.aggregate({ _sum: { scanCount: true } }),
      prisma.qRScanLog.count({ where: { scannedAt: { gte: startOfDay } } }),
      prisma.qRScanLog.count({ where: { scannedAt: { gte: start7d } } }),
      prisma.qRScanLog.count({ where: { scannedAt: { gte: start30d } } }),
      prisma.qRScanLog.count({ where: { scannedAt: { gte: startOfMonth } } }),
      prisma.gramProductBatch.count(),
      prisma.gramProductItem.count(),
      prisma.gramProductItem.aggregate({ _sum: { scanCount: true } }),
      prisma.gramQRScanLog.count({ where: { scannedAt: { gte: startOfDay } } }),
      prisma.gramQRScanLog.count({ where: { scannedAt: { gte: start7d } } }),
      prisma.gramQRScanLog.count({ where: { scannedAt: { gte: start30d } } }),
      prisma.gramQRScanLog.count({ where: { scannedAt: { gte: startOfMonth } } }),
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
      scansLast7Days,
      scansLast30Days,
      scansThisMonth,
      gramScansLast7Days,
      gramScansLast30Days,
      gramScansThisMonth,
      combinedScansLast7Days: scansLast7Days + gramScansLast7Days,
      combinedScansLast30Days: scansLast30Days + gramScansLast30Days,
      combinedScansThisMonth: scansThisMonth + gramScansThisMonth,
    });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    
    // Provide more specific error messages
    if (error.code === "P1001" || error.message?.includes("Can't reach database")) {
      return NextResponse.json(
        { 
          error: "Database connection failed. MySQL service may be down.",
          details: "Please check Railway MySQL service status and restart if needed."
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch stats", details: error.message },
      { status: 500 }
    );
  }
}
