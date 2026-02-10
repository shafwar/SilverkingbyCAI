/**
 * Shared logic for exporting scan logs to CSV, uploading to R2, and purging raw logs.
 * Used by both admin POST API and cron API.
 */

import { prisma } from "@/lib/prisma";
import { uploadToR2, getSignedUrlFromR2, fileExistsInR2 } from "@/lib/r2-client";

export const REPORTS_PREFIX = "reports/scan-logs";

export function getLastMonth(): { month: number; year: number } {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1);
  return { month: last.getMonth() + 1, year: last.getFullYear() };
}

export function getMonthRange(month: number, year: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export type ExportPurgeResult = {
  success: boolean;
  month: number;
  year: number;
  summaryInserted: number;
  page1Deleted: number;
  page2Deleted: number;
  csvRows: number;
  filename: string;
  downloadUrl: string;
  verified: boolean; // Database verified empty after purge
  r2Uploaded: boolean; // CSV successfully uploaded to R2
  remainingPage1Logs: number; // Should be 0 after successful purge
  remainingPage2Logs: number; // Should be 0 after successful purge
};

export type ExportPurgeError = {
  success: false;
  error: string;
  details?: string;
};

export async function runExportPurge(
  month: number,
  year: number
): Promise<ExportPurgeResult | ExportPurgeError> {
  const { start, end } = getMonthRange(month, year);

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

  // Structure matches product export: Name, WeightGr, SerialCode, Price, Stock, ScanCount, LastScan, QRImage, IP
  const headers = ["Name", "WeightGr", "SerialCode", "Price", "Stock", "ScanCount", "LastScan", "QRImage", "IP"];
  const escape = (v: string | number | null | undefined): string => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const fmtDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, "0");
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${day}/${m}/${yy}`;
  };

  const rows: string[] = [headers.join(",")];
  for (const log of page1Logs) {
    const p = log.qrRecord?.product;
    const r = log.qrRecord;
    rows.push(
      [
        escape(p?.name),
        escape(p?.weight ?? ""),
        escape(r?.serialCode),
        escape(p?.price ?? ""),
        escape(p?.stock ?? ""),
        1,
        fmtDate(log.scannedAt),
        escape(r?.qrImageUrl ?? ""),
        escape(log.ip ?? ""),
      ].join(",")
    );
  }
  for (const log of page2Logs) {
    const b = log.qrItem?.batch;
    const item = log.qrItem;
    rows.push(
      [
        escape(b?.name ?? ""),
        escape(b?.weight ?? ""),
        escape(item?.serialCode ?? log.qrItem?.uniqCode),
        "",
        "",
        1,
        fmtDate(log.scannedAt),
        escape(item?.qrImageUrl ?? ""),
        escape(log.ip ?? ""),
      ].join(",")
    );
  }

  const csvContent = rows.join("\n");
  const filename = `${year}-${String(month).padStart(2, "0")}.csv`;
  const r2Key = `${REPORTS_PREFIX}/${filename}`;

  // Don't overwrite R2 if no data - preserves existing file when run twice
  if (page1Logs.length === 0 && page2Logs.length === 0) {
    // Verify database is empty
    const [remainingPage1Logs, remainingPage2Logs] = await Promise.all([
      prisma.qRScanLog.count({
        where: { scannedAt: { gte: start, lte: end } },
      }),
      prisma.gramQRScanLog.count({
        where: { scannedAt: { gte: start, lte: end } },
      }),
    ]);

    // Check if CSV already exists in R2
    const r2Uploaded = await fileExistsInR2(r2Key);
    let downloadUrl = "";
    if (r2Uploaded) {
      try {
        downloadUrl = await getSignedUrlFromR2(r2Key, 7 * 24 * 3600); // 7 days
      } catch (error) {
        console.error("[ExportPurge] Failed to generate signed URL:", error);
        // Fallback to public URL if signed URL fails
        const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";
        downloadUrl = base ? `${base}/${r2Key}` : "";
      }
    }

    return {
      success: true,
      month,
      year,
      summaryInserted: allDates.size,
      page1Deleted: 0,
      page2Deleted: 0,
      csvRows: 0,
      filename,
      downloadUrl,
      verified: remainingPage1Logs === 0 && remainingPage2Logs === 0,
      r2Uploaded,
      remainingPage1Logs,
      remainingPage2Logs,
    };
  }

  try {
    await uploadToR2(
      r2Key,
      Buffer.from(csvContent, "utf-8"),
      "text/csv; charset=utf-8",
      { month: String(month), year: String(year) }
    );
  } catch (e) {
    console.error("[ExportPurge] R2 upload failed:", e);
    return {
      success: false,
      error: "Failed to upload CSV to R2. Logs were NOT purged.",
      details: e instanceof Error ? e.message : "Unknown error",
    };
  }

  const [page1Deleted, page2Deleted] = await Promise.all([
    prisma.qRScanLog.deleteMany({
      where: { scannedAt: { gte: start, lte: end } },
    }),
    prisma.gramQRScanLog.deleteMany({
      where: { scannedAt: { gte: start, lte: end } },
    }),
  ]);

  // CRITICAL: Verify that database is actually empty after purge
  const [remainingPage1Logs, remainingPage2Logs] = await Promise.all([
    prisma.qRScanLog.count({
      where: { scannedAt: { gte: start, lte: end } },
    }),
    prisma.gramQRScanLog.count({
      where: { scannedAt: { gte: start, lte: end } },
    }),
  ]);

  // Verify R2 upload was successful
  const r2Uploaded = await fileExistsInR2(r2Key);
  const verified = remainingPage1Logs === 0 && remainingPage2Logs === 0;

  if (!verified) {
    console.error("[ExportPurge] Verification failed - logs still exist in database:", {
      remainingPage1Logs,
      remainingPage2Logs,
      deletedPage1: page1Deleted.count,
      deletedPage2: page2Deleted.count,
    });
  }

  if (!r2Uploaded) {
    console.error("[ExportPurge] R2 upload verification failed - file not found:", r2Key);
  }

  // Generate signed URL for secure download (valid for 7 days)
  let downloadUrl = "";
  if (r2Uploaded) {
    try {
      downloadUrl = await getSignedUrlFromR2(r2Key, 7 * 24 * 3600); // 7 days
    } catch (error) {
      console.error("[ExportPurge] Failed to generate signed URL:", error);
      // Fallback to public URL if signed URL fails
      const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";
      downloadUrl = base ? `${base}/${r2Key}` : "";
    }
  }

  return {
    success: true,
    month,
    year,
    summaryInserted: allDates.size,
    page1Deleted: page1Deleted.count,
    page2Deleted: page2Deleted.count,
    csvRows: rows.length - 1,
    filename,
    downloadUrl,
    verified,
    r2Uploaded,
    remainingPage1Logs,
    remainingPage2Logs,
  };
}

/**
 * Export scan logs for a month - from raw logs or R2 (if purged)
 * Returns { type: 'csv', buffer, filename } or { type: 'redirect', url }
 */
export async function exportScanLogsForMonth(
  month: number,
  year: number
): Promise<
  | { type: "csv"; buffer: Buffer; filename: string }
  | { type: "redirect"; url: string; filename: string }
  | { type: "empty"; message: string }
> {
  const { start, end } = getMonthRange(month, year);
  const filename = `${year}-${String(month).padStart(2, "0")}.csv`;
  const r2Key = `${REPORTS_PREFIX}/${filename}`;

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

  const escape = (v: string | number | null | undefined): string => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const fmtDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, "0");
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${day}/${m}/${yy}`;
  };

  // Structure matches product export: Name, WeightGr, SerialCode, Price, Stock, ScanCount, LastScan, QRImage, IP
  const headers = ["Name", "WeightGr", "SerialCode", "Price", "Stock", "ScanCount", "LastScan", "QRImage", "IP"];
  const rows: string[] = [headers.join(",")];
  for (const log of page1Logs) {
    const p = log.qrRecord?.product;
    const r = log.qrRecord;
    rows.push(
      [
        escape(p?.name),
        escape(p?.weight ?? ""),
        escape(r?.serialCode),
        escape(p?.price ?? ""),
        escape(p?.stock ?? ""),
        1,
        fmtDate(log.scannedAt),
        escape(r?.qrImageUrl ?? ""),
        escape(log.ip ?? ""),
      ].join(",")
    );
  }
  for (const log of page2Logs) {
    const b = log.qrItem?.batch;
    const item = log.qrItem;
    rows.push(
      [
        escape(b?.name ?? ""),
        escape(b?.weight ?? ""),
        escape(item?.serialCode ?? log.qrItem?.uniqCode),
        "",
        "",
        1,
        fmtDate(log.scannedAt),
        escape(item?.qrImageUrl ?? ""),
        escape(log.ip ?? ""),
      ].join(",")
    );
  }

  if (rows.length > 1) {
    return {
      type: "csv",
      buffer: Buffer.from(rows.join("\n"), "utf-8"),
      filename,
    };
  }

  const exists = await fileExistsInR2(r2Key);
  if (exists) {
    const url = await getSignedUrlFromR2(r2Key, 3600);
    return { type: "redirect", url, filename };
  }

  return {
    type: "empty",
    message: `No scan logs for ${year}-${String(month).padStart(2, "0")}`,
  };
}
