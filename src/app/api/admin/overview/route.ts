import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [productCount, totalScans, recentLogs] = await Promise.all([
      prisma.product.count(),
      prisma.qrRecord.aggregate({ _sum: { scanCount: true } }),
      prisma.qRScanLog.findMany({
        orderBy: { scannedAt: "desc" },
        include: { qrRecord: { include: { product: true } } },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      totalProducts: productCount,
      totalScans: totalScans._sum.scanCount ?? 0,
      recentLogs,
    });
  } catch (error) {
    console.error("Error fetching overview:", error);
    return NextResponse.json(
      { error: "Failed to fetch overview" },
      { status: 500 }
    );
  }
}

