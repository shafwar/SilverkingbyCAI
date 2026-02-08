/**
 * GET /api/admin/scans/export?month=1&year=2026
 *
 * Export scan logs for selected month.
 * - If raw logs exist: generate CSV and return file
 * - If purged (R2 has file): return signed URL redirect
 * - If neither: return empty message
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportScanLogsForMonth } from "@/lib/export-purge-logs";

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

    const result = await exportScanLogsForMonth(month, year);

    if (result.type === "csv") {
      return new NextResponse(result.buffer, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${result.filename}"`,
        },
      });
    }

    if (result.type === "redirect") {
      return NextResponse.json({ url: result.url, filename: result.filename });
    }

    return NextResponse.json(
      { error: result.message || "No data available" },
      { status: 404 }
    );
  } catch (error) {
    console.error("[Scans Export] Error:", error);
    return NextResponse.json(
      { error: "Failed to export scan logs" },
      { status: 500 }
    );
  }
}
