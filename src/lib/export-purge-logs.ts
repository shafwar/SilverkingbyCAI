/**
 * Shared logic for exporting scan logs to CSV, uploading to R2, and purging raw logs.
 * Used by both admin POST API and cron API.
 */

import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2-client";

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

  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";
  const downloadUrl = base ? `${base}/${r2Key}` : "";

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
  };
}
