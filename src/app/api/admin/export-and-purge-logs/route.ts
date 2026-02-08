/**
 * POST /api/admin/export-and-purge-logs
 *
 * Monthly Rekap: Export scan logs to CSV, upload to R2, and purge raw logs.
 * - Step 1: Aggregate by date → insert into ScanLogSummary (for chart)
 * - Step 2: Export raw logs to CSV
 * - Step 3: Upload CSV to R2 (reports/scan-logs/YYYY-MM.csv)
 * - Step 4: Purge raw logs from QRScanLog & GramQRScanLog (only if upload succeeds)
 *
 * Body: { month?: number, year?: number } — defaults to last month
 * Does NOT touch: QrRecord.scanCount, GramProductItem.scanCount, Product, User, etc.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2-client";

const REPORTS_PREFIX = "reports/scan-logs";

function getLastMonth(): { month: number; year: number } {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1);
  return { month: last.getMonth() + 1, year: last.getFullYear() };
}

function getMonthRange(month: number, year: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let month: number;
    let year: number;
    try {
      const body = (await request.json().catch(() => ({}))) as { month?: number; year?: number };
      if (body.month != null && body.year != null) {
        month = Number(body.month);
        year = Number(body.year);
        if (!Number.isFinite(month) || month < 1 || month > 12 || !Number.isFinite(year)) {
          return NextResponse.json(
            { error: "Invalid month or year. Use month 1-12 and valid year." },
            { status: 400 }
          );
        }
      } else {
        const last = getLastMonth();
        month = last.month;
        year = last.year;
      }
    } catch {
      const last = getLastMonth();
      month = last.month;
      year = last.year;
    }

    const { start, end } = getMonthRange(month, year);

    // Step 1 & 2: Fetch raw logs for both summary aggregation and CSV export
    const [page1Logs, page2Logs] = await Promise.all([
      prisma.qRScanLog.findMany({
        where: { scannedAt: { gte: start, lte: end } },
        include: { qrRecord: { include: { product: true } } },
        orderBy: { scannedAt: "asc" },
      }),
      prisma.gramQRScanLog.findMany({
        where: { scannedAt: { gte: start, lte: end } },
        include: { qrItem: { include: { batch: true } } },
        orderBy: { scannedAt: "asc" },
      }),
    ]);

    // Aggregate by date for ScanLogSummary
    const page1Map = new Map<string, number>();
    for (const log of page1Logs) {
      const key = log.scannedAt.toISOString().slice(0, 10);
      page1Map.set(key, (page1Map.get(key) ?? 0) + 1);
    }
    const page2Map = new Map<string, number>();
    for (const log of page2Logs) {
      const key = log.scannedAt.toISOString().slice(0, 10);
      page2Map.set(key, (page2Map.get(key) ?? 0) + 1);
    }

    const allDates = new Set([...page1Map.keys(), ...page2Map.keys()]);
    for (const dateStr of allDates) {
      const page1Scans = page1Map.get(dateStr) ?? 0;
      const page2Scans = page2Map.get(dateStr) ?? 0;
      const totalScans = page1Scans + page2Scans;
      const dateOnly = new Date(dateStr + "T00:00:00Z");

      await prisma.scanLogSummary.upsert({
        where: { date: dateOnly },
        create: { date: dateOnly, page1Scans, page2Scans, totalScans },
        update: { page1Scans, page2Scans, totalScans },
      });
    }

    // Step 2: Build CSV from already-fetched logs
    const headers = [
      "tanggal",
      "waktu",
      "serialCode",
      "namaProduk",
      "ip",
      "userAgent",
      "lokasi",
      "sumber",
    ];
    const escape = (v: string | null | undefined): string => {
      if (v == null) return "";
      const s = String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows: string[] = [headers.join(",")];
    for (const log of page1Logs) {
      const d = log.scannedAt;
      rows.push(
        [
          d.toISOString().slice(0, 10),
          d.toTimeString().slice(0, 8),
          escape(log.qrRecord?.serialCode),
          escape(log.qrRecord?.product?.name),
          escape(log.ip),
          escape(log.userAgent),
          escape(log.location),
          "page1",
        ].join(",")
      );
    }
    for (const log of page2Logs) {
      const d = log.scannedAt;
      rows.push(
        [
          d.toISOString().slice(0, 10),
          d.toTimeString().slice(0, 8),
          escape(log.qrItem?.uniqCode),
          escape(log.qrItem?.batch?.name ? `${log.qrItem.batch.name} (Page 2)` : ""),
          escape(log.ip),
          escape(log.userAgent),
          escape(log.location),
          "page2",
        ].join(",")
      );
    }

    const csvContent = rows.join("\n");
    const filename = `${year}-${String(month).padStart(2, "0")}.csv`;
    const r2Key = `${REPORTS_PREFIX}/${filename}`;

    // Step 3: Upload CSV to R2 (must succeed before purge)
    try {
      await uploadToR2(
        r2Key,
        Buffer.from(csvContent, "utf-8"),
        "text/csv; charset=utf-8",
        { month: String(month), year: String(year) }
      );
    } catch (e) {
      console.error("[ExportPurge] R2 upload failed:", e);
      return NextResponse.json(
        {
          error: "Failed to upload CSV to R2. Logs were NOT purged. Check R2 config.",
          details: e instanceof Error ? e.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Step 4: Purge raw logs only after successful upload
    const [page1Deleted, page2Deleted] = await Promise.all([
      prisma.qRScanLog.deleteMany({
        where: { scannedAt: { gte: start, lte: end } },
      }),
      prisma.gramQRScanLog.deleteMany({
        where: { scannedAt: { gte: start, lte: end } },
      }),
    ]);

    const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";
    const downloadUrl = base ? `${base}/${r2Key}` : "";

    return NextResponse.json({
      success: true,
      month,
      year,
      summaryInserted: allDates.size,
      page1Deleted: page1Deleted.count,
      page2Deleted: page2Deleted.count,
      csvRows: rows.length - 1,
      filename,
      downloadUrl,
    });
  } catch (error) {
    console.error("[ExportPurge] Error:", error);
    return NextResponse.json(
      { error: "Failed to export and purge logs" },
      { status: 500 }
    );
  }
}
