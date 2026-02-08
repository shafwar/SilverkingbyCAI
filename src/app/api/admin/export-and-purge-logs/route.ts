/**
 * POST /api/admin/export-and-purge-logs
 *
 * Monthly Rekap: Export scan logs to CSV, upload to R2, and purge raw logs.
 * Admin-only (session auth).
 * Body: { month?: number, year?: number } — defaults to last month
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  runExportPurge,
  getLastMonth,
} from "@/lib/export-purge-logs";

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

    const result = await runExportPurge(month, year);

    if (!result.success) {
      const err = result as { error: string; details?: string };
      return NextResponse.json(
        { error: err.error, details: err.details },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ExportPurge] Error:", error);
    return NextResponse.json(
      { error: "Failed to export and purge logs" },
      { status: 500 }
    );
  }
}
