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
      // Get scan logs with product information
      const scanLogs = await prisma.qRScanLog.findMany({
        where: {
          scannedAt: {
            gte: new Date(Date.now() - range * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          qrRecord: {
            include: {
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          scannedAt: "desc",
        },
      });

      // Group by product name
      const productCounts = new Map<string, number>();
      scanLogs.forEach((log) => {
        const productName = log.qrRecord?.product?.name ?? "Unknown";
        productCounts.set(productName, (productCounts.get(productName) || 0) + 1);
      });

      // Convert to array and sort by count
      const distribution = Array.from(productCounts.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      // Return with cache control headers for real-time updates
      return NextResponse.json(
        { distribution },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        }
      );
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


