import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [productCount, totalScans, recentLogs, gramBatchCount, gramTotalScans, recentGramLogs] =
      await Promise.all([
        prisma.product.count(),
        prisma.qrRecord.aggregate({ _sum: { scanCount: true } }),
        prisma.qRScanLog.findMany({
          orderBy: { scannedAt: "desc" },
          include: { qrRecord: { include: { product: true } } },
          take: 10,
        }),
        prisma.gramProductBatch.count(),
        prisma.gramProductItem.aggregate({ _sum: { scanCount: true } }),
        prisma.gramQRScanLog.findMany({
          orderBy: { scannedAt: "desc" },
          include: { qrItem: { include: { batch: true } } },
          take: 10,
        }),
      ]);

    // Format gram logs to match page1 format
    const formattedGramLogs = recentGramLogs.map((log) => ({
      id: log.id,
      scannedAt: log.scannedAt,
      ip: log.ip,
      userAgent: log.userAgent,
      location: log.location,
      source: "page2" as const,
      qrRecord: null,
      gramItem: {
        uniqCode: log.qrItem.uniqCode,
        batch: {
          name: log.qrItem.batch.name,
          weight: log.qrItem.batch.weight,
        },
      },
    }));

    // Format page1 logs
    const formattedPage1Logs = recentLogs.map((log) => ({
      ...log,
      source: "page1" as const,
      gramItem: null,
    }));

    // Combine and sort by scannedAt
    const allRecentLogs = [...formattedPage1Logs, ...formattedGramLogs]
      .sort((a, b) => b.scannedAt.getTime() - a.scannedAt.getTime())
      .slice(0, 10);

    return NextResponse.json({
      totalProducts: productCount,
      totalScans: totalScans._sum.scanCount ?? 0,
      recentLogs: allRecentLogs,
      // Page 2 data
      gramBatches: gramBatchCount,
      gramTotalScans: gramTotalScans._sum.scanCount ?? 0,
      // Combined
      combinedTotalProducts: productCount + gramBatchCount,
      combinedTotalScans: (totalScans._sum.scanCount ?? 0) + (gramTotalScans._sum.scanCount ?? 0),
    });
  } catch (error) {
    console.error("Error fetching overview:", error);
    return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
  }
}
