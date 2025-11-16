import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rangeParam = Number(searchParams.get("range") ?? 7);
  const range = Number.isNaN(rangeParam) ? 7 : Math.min(Math.max(rangeParam, 1), 60);

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (range - 1));
  startDate.setHours(0, 0, 0, 0);

  const scanLogs = await prisma.qRScanLog.findMany({
    where: {
      scannedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: { scannedAt: true },
  });

  const buckets = Array.from({ length: range }).map((_, index) => {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + index);
    const dayLabel = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return {
      key: day.toISOString().slice(0, 10),
      label: dayLabel,
      count: 0,
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  scanLogs.forEach((log) => {
    const key = log.scannedAt.toISOString().slice(0, 10);
    const bucket = bucketMap.get(key);
    if (bucket) {
      bucket.count += 1;
    }
  });

  return NextResponse.json({
    range,
    data: buckets.map((bucket) => ({ date: bucket.label, count: bucket.count })),
  });
}


