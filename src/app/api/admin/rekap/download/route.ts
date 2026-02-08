/**
 * GET /api/admin/rekap/download?file=YYYY-MM.csv
 *
 * Get signed download URL for a monthly scan report CSV in R2.
 * Admin-only. Returns { url } with a short-lived signed URL.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSignedUrlFromR2 } from "@/lib/r2-client";

const REPORTS_PREFIX = "reports/scan-logs";
const VALID_FILE_REGEX = /^\d{4}-\d{2}\.csv$/;

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file");
    if (!file || !VALID_FILE_REGEX.test(file)) {
      return NextResponse.json(
        { error: "Invalid file. Use format YYYY-MM.csv" },
        { status: 400 }
      );
    }

    const key = `${REPORTS_PREFIX}/${file}`;
    const url = await getSignedUrlFromR2(key, 3600); // 1 hour expiry

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[Rekap Download] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
