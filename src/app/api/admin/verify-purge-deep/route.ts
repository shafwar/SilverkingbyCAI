/**
 * GET /api/admin/verify-purge-deep?month=11&year=2025
 *
 * Deep analysis endpoint untuk verifikasi bahwa logs benar-benar sudah dihapus
 * dari database untuk bulan tertentu.
 * 
 * Returns comprehensive verification report:
 * - Count queries (Prisma & Raw SQL)
 * - IP address check
 * - ScanLogSummary check
 * - R2 CSV file check
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

    // 1. COUNT QUERY - Cek jumlah total logs (Prisma)
    const [page1Count, page2Count] = await Promise.all([
      prisma.qRScanLog.count({
        where: { scannedAt: { gte: start, lte: end } },
      }),
      prisma.gramQRScanLog.count({
        where: { scannedAt: { gte: start, lte: end } },
      }),
    ]);

    // 2. DETAILED QUERY - Cek apakah ada data dengan IP addresses
    const [page1WithIP, page2WithIP] = await Promise.all([
      prisma.qRScanLog.findMany({
        where: {
          scannedAt: { gte: start, lte: end },
          ip: { not: null },
        },
        select: {
          id: true,
          ip: true,
          scannedAt: true,
        },
        take: 10, // Limit untuk performance
      }),
      prisma.gramQRScanLog.findMany({
        where: {
          scannedAt: { gte: start, lte: end },
          ip: { not: null },
        },
        select: {
          id: true,
          ip: true,
          scannedAt: true,
        },
        take: 10,
      }),
    ]);

    // 3. RAW SQL QUERY - Double check dengan raw SQL
    const [rawPage1, rawPage2] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM QRScanLog
        WHERE scannedAt >= ${start}
          AND scannedAt <= ${end}
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM GramQRScanLog
        WHERE scannedAt >= ${start}
          AND scannedAt <= ${end}
      `,
    ]);

    const rawPage1Count = Number(rawPage1[0]?.count || 0);
    const rawPage2Count = Number(rawPage2[0]?.count || 0);

    // 4. CHECK SCANLOGSUMMARY - Cek apakah rekapan sudah dibuat
    const summaries = await prisma.scanLogSummary.findMany({
      where: {
        date: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0),
        },
      },
    });

    const totalScansInSummary = summaries.reduce((sum, s) => sum + s.totalScans, 0);

    // 5. CHECK R2 CSV FILE - Cek apakah CSV sudah di-upload ke R2
    const filename = `${year}-${String(month).padStart(2, "0")}.csv`;
    const r2Key = `${REPORTS_PREFIX}/${filename}`;
    const csvExists = await fileExistsInR2(r2Key);

    let downloadUrl = "";
    if (csvExists) {
      try {
        downloadUrl = await getSignedUrlFromR2(r2Key, 7 * 24 * 3600);
      } catch (error) {
        console.error("[VerifyPurgeDeep] Failed to generate signed URL:", error);
      }
    }

    // 6. FINAL VERIFICATION
    const isDatabaseEmpty = page1Count === 0 && page2Count === 0 && rawPage1Count === 0 && rawPage2Count === 0;
    const hasNoIP = page1WithIP.length === 0 && page2WithIP.length === 0;
    const hasSummary = summaries.length > 0;
    const hasR2File = csvExists;
    const fullyPurged = isDatabaseEmpty && hasNoIP && hasSummary && hasR2File;

    return NextResponse.json({
      month,
      year,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      verification: {
        // Count queries
        prismaCount: {
          page1: page1Count,
          page2: page2Count,
          total: page1Count + page2Count,
        },
        rawSqlCount: {
          page1: rawPage1Count,
          page2: rawPage2Count,
          total: rawPage1Count + rawPage2Count,
        },
        // IP addresses
        ipAddresses: {
          page1: page1WithIP.map((log) => ({
            id: log.id,
            ip: log.ip,
            scannedAt: log.scannedAt.toISOString(),
          })),
          page2: page2WithIP.map((log) => ({
            id: log.id,
            ip: log.ip,
            scannedAt: log.scannedAt.toISOString(),
          })),
          totalFound: page1WithIP.length + page2WithIP.length,
        },
        // ScanLogSummary
        summary: {
          exists: hasSummary,
          recordCount: summaries.length,
          totalScans: totalScansInSummary,
          records: summaries.map((s) => ({
            date: s.date.toISOString(),
            page1Scans: s.page1Scans,
            page2Scans: s.page2Scans,
            totalScans: s.totalScans,
          })),
        },
        // R2 CSV
        r2Csv: {
          exists: hasR2File,
          filename,
          key: r2Key,
          downloadUrl: downloadUrl || null,
        },
      },
      status: {
        isDatabaseEmpty,
        hasNoIP,
        hasSummary,
        hasR2File,
        fullyPurged,
      },
      conclusion: fullyPurged
        ? "✅ PURGE LENGKAP & VERIFIED - Database kosong, tidak ada IP, rekapan dibuat, CSV di R2"
        : isDatabaseEmpty && hasNoIP
        ? "⚠️ PURGE SEBAGIAN - Database kosong tapi beberapa komponen belum lengkap"
        : "❌ PURGE BELUM LENGKAP - Masih ada data di database",
    });
  } catch (error) {
    console.error("[VerifyPurgeDeep] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to verify purge status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
