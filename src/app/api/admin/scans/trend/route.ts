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
      const now = new Date();
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
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      
      startDate = new Date(year, month, 1, 0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    }

    // Fetch scan logs (Page 1)
    const scanLogs = await prisma.qRScanLog.findMany({
      where: {
        scannedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { scannedAt: true },
    });

    // Fetch gram scan logs (Page 2)
    const gramScanLogs = await prisma.gramQRScanLog.findMany({
      where: {
        scannedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { scannedAt: true },
    });

    // Create buckets for each day
    const buckets: Array<{ key: string; label: string; count: number; page1Count: number; page2Count: number; date: Date }> = [];
    
    if (isMonthView) {
      // Month view: create buckets for each day from day 1 to end date
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayLabel = currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
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
      month: isMonthView ? (startDate.getMonth() + 1) : null,
      year: isMonthView ? startDate.getFullYear() : null,
      data: buckets.map((bucket) => ({
        date: bucket.label,
        count: bucket.count,
        page1Count: bucket.page1Count,
        page2Count: bucket.page2Count,
      })),
    });
  } catch (error) {
    console.error("Error fetching scan trend:", error);
    return NextResponse.json(
      { error: "Failed to fetch scan trend" },
      { status: 500 }
    );
  }
}
