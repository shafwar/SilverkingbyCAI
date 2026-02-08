/**
 * GET /api/admin/rekap/list
 *
 * List monthly scan report CSVs stored in R2 (reports/scan-logs/YYYY-MM.csv)
 * Admin-only. Returns list of available report files for the Rekap page.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listObjectsInR2, getPublicUrl } from "@/lib/r2-client";

const REPORTS_PREFIX = "reports/scan-logs";

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await listObjectsInR2(REPORTS_PREFIX);

    // Filter to .csv files and parse YYYY-MM.csv format
    const reports = keys
      .filter((k) => k.endsWith(".csv"))
      .map((key) => {
        const filename = key.split("/").pop() ?? key;
        const match = filename.match(/^(\d{4})-(\d{2})\.csv$/);
        const year = match ? parseInt(match[1], 10) : null;
        const month = match ? parseInt(match[2], 10) : null;
        return {
          filename,
          key,
          year,
          month,
          url: getPublicUrl(key),
        };
      })
      .filter((r) => r.year != null && r.month != null)
      .sort((a, b) => {
        const ay = a.year ?? 0;
        const am = a.month ?? 0;
        const by = b.year ?? 0;
        const bm = b.month ?? 0;
        return ay !== by ? by - ay : bm - am;
      });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("[Rekap List] Error:", error);
    return NextResponse.json(
      { error: "Failed to list reports" },
      { status: 500 }
    );
  }
}
