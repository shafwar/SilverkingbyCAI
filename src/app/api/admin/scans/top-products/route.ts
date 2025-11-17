import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");
    const rangeParam = Number(searchParams.get("range") ?? 30);
    const range = Number.isNaN(rangeParam) ? 30 : Math.min(Math.max(rangeParam, 1), 90);

    if (view === "distribution") {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - range);

      const distribution = await prisma.qRScanLog.groupBy({
        by: ["location"],
        _count: { location: true },
        where: {
          scannedAt: {
            gte: startDate,
          },
        },
        orderBy: {
          _count: {
            location: "desc",
          },
        },
        take: 6,
      });

      const normalized = distribution.map((entry) => ({
        label: entry.location ?? "Unknown",
        value: entry._count.location,
      }));

      return NextResponse.json({ distribution: normalized });
    }

    // Fix: Get all products with QR records, then sort in memory
    const products = await prisma.product.findMany({
      include: { qrRecord: true },
      take: 100, // Get more to sort properly
    });

    // Sort by scanCount descending, then take top 6
    const sorted = products
      .map((product) => ({
        name: product.name,
        scans: product.qrRecord?.scanCount ?? 0,
      }))
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 6);

    return NextResponse.json({ products: sorted });
  } catch (error) {
    console.error("Error fetching top products:", error);
    return NextResponse.json(
      { error: "Failed to fetch top products" },
      { status: 500 }
    );
  }
}


