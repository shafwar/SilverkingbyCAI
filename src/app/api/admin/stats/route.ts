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
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}


