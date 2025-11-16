import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
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

  const products = await prisma.product.findMany({
    include: { qrRecord: true },
    orderBy: {
      qrRecord: {
        scanCount: "desc",
      },
    },
    take: 6,
  });

  const payload = products.map((product) => ({
    name: product.name,
    scans: product.qrRecord?.scanCount ?? 0,
  }));

  return NextResponse.json({ products: payload });
}


