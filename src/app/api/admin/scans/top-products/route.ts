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
      // Get scan logs with product information (Page 1)
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

      // Get gram scan logs (Page 2)
      const gramScanLogs = await prisma.gramQRScanLog.findMany({
        where: {
          scannedAt: {
            gte: new Date(Date.now() - range * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          qrItem: {
            include: {
              batch: {
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

      // Group by product name (Page 1)
      const productCounts = new Map<string, { value: number; source: "page1" | "page2" }>();
      scanLogs.forEach((log) => {
        const productName = log.qrRecord?.product?.name ?? "Unknown";
        const existing = productCounts.get(productName) || { value: 0, source: "page1" as const };
        productCounts.set(productName, { value: existing.value + 1, source: "page1" });
      });

      // Group by batch name (Page 2)
      gramScanLogs.forEach((log) => {
        const batchName = `${log.qrItem.batch.name} (Page 2)`;
        const existing = productCounts.get(batchName) || { value: 0, source: "page2" as const };
        productCounts.set(batchName, { value: existing.value + 1, source: "page2" });
      });

      // Convert to array and sort by count
      const distribution = Array.from(productCounts.entries())
        .map(([label, data]) => ({ label, value: data.value, source: data.source }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      // Return with cache control headers for real-time updates
      return NextResponse.json(
        { distribution },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    // Get all products with QR records (Page 1)
    const products = await prisma.product.findMany({
      include: { qrRecord: true },
      take: 100,
    });

    // Get all gram batches with items (Page 2)
    const gramBatches = await prisma.gramProductBatch.findMany({
      include: { items: true },
      take: 100,
    });

    // Sort Page 1 products by scanCount
    const page1Products = products
      .map((product) => ({
        name: product.name,
        scans: product.qrRecord?.scanCount ?? 0,
        source: "page1" as const,
      }))
      .sort((a, b) => b.scans - a.scans);

    // Sort Page 2 batches by total scanCount from items
    const page2Products = gramBatches
      .map((batch) => {
        const totalScans = batch.items.reduce((sum, item) => sum + item.scanCount, 0);
        return {
          name: `${batch.name} (Page 2)`,
          scans: totalScans,
          source: "page2" as const,
        };
      })
      .sort((a, b) => b.scans - a.scans);

    // Combine and take top 6
    const sorted = [...page1Products, ...page2Products]
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 6);

    return NextResponse.json({ products: sorted });
  } catch (error) {
    console.error("Error fetching top products:", error);
    return NextResponse.json({ error: "Failed to fetch top products" }, { status: 500 });
  }
}
