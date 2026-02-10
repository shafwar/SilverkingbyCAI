/**
 * GET /api/admin/scans/purge-status?month=11&year=2025
 *
 * Check purge status for a specific month.
 * Returns verification status: database empty, CSV in R2, etc.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fileExistsInR2, getSignedUrlFromR2 } from "@/lib/r2-client";
import { getMonthRange, REPORTS_PREFIX } from "@/lib/export-purge-logs";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") ?? "0", 10);
    const year = parseInt(searchParams.get("year") ?? "0", 10);

    if (!Number.isFinite(month) || month < 1 || month > 12 || !Number.isFinite(year)) {
      return NextResponse.json(
        { error: "Invalid month or year. Use month 1-12 and valid year." },
        { status: 400 }
      );
    }

    const { start, end } = getMonthRange(month, year);

    // Check if database is empty for this month
    const [remainingPage1Logs, remainingPage2Logs] = await Promise.all([
      prisma.qRScanLog.count({
        where: { scannedAt: { gte: start, lte: end } },
      }),
      prisma.gramQRScanLog.count({
        where: { scannedAt: { gte: start, lte: end } },
      }),
    ]);

    const databaseEmpty = remainingPage1Logs === 0 && remainingPage2Logs === 0;

    // Check if CSV exists in R2
    const filename = `${year}-${String(month).padStart(2, "0")}.csv`;
    const r2Key = `${REPORTS_PREFIX}/${filename}`;
    const csvExists = await fileExistsInR2(r2Key);

    // Generate download URL if CSV exists
    let downloadUrl = "";
    if (csvExists) {
      try {
        downloadUrl = await getSignedUrlFromR2(r2Key, 7 * 24 * 3600); // 7 days
      } catch (error) {
        console.error("[PurgeStatus] Failed to generate signed URL:", error);
        // Fallback to public URL if signed URL fails
        const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";
        downloadUrl = base ? `${base}/${r2Key}` : "";
      }
    }

    // Check if ScanLogSummary exists (indicates purge was done)
    const summaryExists = await prisma.scanLogSummary.findFirst({
      where: {
        date: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0),
        },
      },
    });

    // Determine purge status
    const isPurged = databaseEmpty && (csvExists || summaryExists !== null);

    return NextResponse.json({
      month,
      year,
      isPurged,
      databaseEmpty,
      csvExists,
      summaryExists: summaryExists !== null,
      remainingPage1Logs,
      remainingPage2Logs,
      downloadUrl: downloadUrl || null,
      filename: csvExists ? filename : null,
    });
  } catch (error) {
    console.error("[PurgeStatus] Error:", error);
    return NextResponse.json(
      { error: "Failed to check purge status" },
      { status: 500 }
    );
  }
}
