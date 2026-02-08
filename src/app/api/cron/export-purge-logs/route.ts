/**
 * GET /api/cron/export-purge-logs
 *
 * Cron endpoint: Auto export & purge scan logs for last month.
 * Runs automatically at start of each month (via GitHub Actions, cron-job.org, etc).
 *
 * Security: Requires CRON_SECRET.
 *   Authorization: Bearer <CRON_SECRET>
 *   OR: x-cron-secret: <CRON_SECRET>
 * Uses timing-safe comparison to prevent timing attacks.
 */

import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { runExportPurge, getLastMonth } from "@/lib/export-purge-logs";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const provided = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : request.headers.get("x-cron-secret");

  if (!provided) return false;

  try {
    const a = Buffer.from(secret, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { month, year } = getLastMonth();
    const result = await runExportPurge(month, year);

    if (!result.success) {
      const err = result as { error: string; details?: string };
      return NextResponse.json(
        { error: err.error, details: err.details },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...result,
      message: `Export & purge completed for ${year}-${String(month).padStart(2, "0")}`,
    });
  } catch (error) {
    console.error("[Cron ExportPurge] Error:", error);
    return NextResponse.json(
      { error: "Cron export-purge failed" },
      { status: 500 }
    );
  }
}
