import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Launch date: November 2025
const LAUNCH_YEAR = 2025;
const LAUNCH_MONTH = 10; // November (0-indexed, so 10 = November, 1-indexed would be 11)

/**
 * Get scan trend data for a specific month
 * Always starts from day 1 of the month
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Support both old range parameter (for backward compatibility) and new month/year parameters
    const rangeParam = searchParams.get("range");
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    let startDate: Date;
    let endDate: Date;
    let isMonthView = false;

    const now = new Date();

    if (monthParam && yearParam) {
      // New month/year view - always start from day 1
      isMonthView = true;
      const month = parseInt(monthParam, 10) - 1; // Convert to 0-indexed (1-12 -> 0-11)
      const year = parseInt(yearParam, 10);

      // Validate launch date - cannot view data before November 2025
      if (year < LAUNCH_YEAR || (year === LAUNCH_YEAR && month < LAUNCH_MONTH)) {
        return NextResponse.json(
          { error: "Data is only available from November 2025 onwards" },
          { status: 400 }
        );
      }

      // Start from day 1 of the month
      startDate = new Date(year, month, 1, 0, 0, 0, 0);

      // End date: last day of month, or today if current month
      const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

      if (isCurrentMonth) {
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Last day of the selected month
        endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
      }
    } else if (rangeParam) {
      // Legacy range-based view (for backward compatibility)
      const range = Number(rangeParam);
      const validRange = Number.isNaN(range) ? 7 : Math.min(Math.max(range, 1), 60);

      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - (validRange - 1));
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Default: current month
      isMonthView = true;
      const year = now.getFullYear();
      const month = now.getMonth();

      startDate = new Date(year, month, 1, 0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    }

    // Historical month = past month (raw logs may have been purged) → use ScanLogSummary
    const isHistoricalMonth =
      isMonthView &&
      (startDate.getFullYear() < now.getFullYear() ||
        (startDate.getFullYear() === now.getFullYear() &&
          startDate.getMonth() < now.getMonth()));

    let scanLogs: { scannedAt: Date }[] = [];
    let gramScanLogs: { scannedAt: Date }[] = [];

    if (isHistoricalMonth) {
      // Read from ScanLogSummary for historical months (raw logs may have been purged)
      const summaries = await prisma.scanLogSummary.findMany({
        where: {
          date: {
            gte: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
            lte: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()),
          },
        },
      });

      // If ScanLogSummary has data, use it
      if (summaries.length > 0) {
        for (const s of summaries) {
          for (let i = 0; i < s.page1Scans; i++) {
            scanLogs.push({ scannedAt: new Date(s.date) });
          }
          for (let i = 0; i < s.page2Scans; i++) {
            gramScanLogs.push({ scannedAt: new Date(s.date) });
          }
        }
      } else {
        // Fallback: ScanLogSummary empty (e.g. Nov-Dec 2025 never purged) → read from raw logs
        // Then backfill ScanLogSummary so next request is fast
        const [page1, page2] = await Promise.all([
          prisma.qRScanLog.findMany({
            where: { scannedAt: { gte: startDate, lte: endDate } },
            select: { scannedAt: true },
          }),
          prisma.gramQRScanLog.findMany({
            where: { scannedAt: { gte: startDate, lte: endDate } },
            select: { scannedAt: true },
          }),
        ]);
        scanLogs = page1;
        gramScanLogs = page2;

        // Backfill ScanLogSummary from raw logs (so next request uses summary)
        const page1Map = new Map<string, number>();
        for (const log of page1) {
          const key = log.scannedAt.toISOString().slice(0, 10);
          page1Map.set(key, (page1Map.get(key) ?? 0) + 1);
        }
        const page2Map = new Map<string, number>();
        for (const log of page2) {
          const key = log.scannedAt.toISOString().slice(0, 10);
          page2Map.set(key, (page2Map.get(key) ?? 0) + 1);
        }
        const allDates = new Set([...page1Map.keys(), ...page2Map.keys()]);
        for (const dateStr of allDates) {
          const page1Scans = page1Map.get(dateStr) ?? 0;
          const page2Scans = page2Map.get(dateStr) ?? 0;
          const dateOnly = new Date(dateStr + "T00:00:00Z");
          await prisma.scanLogSummary.upsert({
            where: { date: dateOnly },
            create: { date: dateOnly, page1Scans, page2Scans, totalScans: page1Scans + page2Scans },
            update: { page1Scans, page2Scans, totalScans: page1Scans + page2Scans },
          });
        }
      }
    } else {
      // Current month or legacy range: use raw logs
      const [page1, page2] = await Promise.all([
        prisma.qRScanLog.findMany({
          where: { scannedAt: { gte: startDate, lte: endDate } },
          select: { scannedAt: true },
        }),

        prisma.gramQRScanLog.findMany({
          where: { scannedAt: { gte: startDate, lte: endDate } },
          select: { scannedAt: true },
        }),
      ]);
      scanLogs = page1;
      gramScanLogs = page2;
    }

    // Create buckets for each day
    const buckets: Array<{
      key: string;
      label: string;
      count: number;
      page1Count: number;
      page2Count: number;
      date: Date;
    }> = [];

    if (isMonthView) {
      // Month view: create buckets for each day from day 1 to end date
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayLabel = currentDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        buckets.push({
          key: currentDate.toISOString().slice(0, 10),
          label: dayLabel,
          count: 0,
          page1Count: 0,
          page2Count: 0,
          date: new Date(currentDate),
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Legacy range view
      const daysDiff =
        Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      for (let i = 0; i < daysDiff; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        const dayLabel = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        buckets.push({
          key: day.toISOString().slice(0, 10),
          label: dayLabel,
          count: 0,
          page1Count: 0,
          page2Count: 0,
          date: new Date(day),
        });
      }
    }

    // Map scan logs to buckets
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    // Count Page 1 scans
    scanLogs.forEach((log) => {
      const key = log.scannedAt.toISOString().slice(0, 10);
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.page1Count += 1;
        bucket.count += 1;
      }
    });

    // Count Page 2 scans
    gramScanLogs.forEach((log) => {
      const key = log.scannedAt.toISOString().slice(0, 10);
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.page2Count += 1;
        bucket.count += 1;
      }
    });

    return NextResponse.json({
      range: buckets.length,
      month: isMonthView ? startDate.getMonth() + 1 : null,
      year: isMonthView ? startDate.getFullYear() : null,
      data: buckets.map((bucket) => ({
        date: bucket.label,
        count: bucket.count,
        page1Count: bucket.page1Count,
        page2Count: bucket.page2Count,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching scan trend:", error);
    
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
      { error: "Failed to fetch scan trend", details: error.message },
      { status: 500 }
    );
  }
}
