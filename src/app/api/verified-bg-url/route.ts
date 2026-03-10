/**
 * Returns full URLs for verified-success background images.
 * Server uses R2_PUBLIC_URL so production always gets correct R2 URLs (no client env dependency).
 * GET /api/verified-bg-url
 */

import { NextResponse } from "next/server";
import { getR2Url } from "@/utils/r2-url";
import { VERIFIED_BG_IMAGES } from "@/assets/verified-bg";

export async function GET() {
  try {
    const urls = VERIFIED_BG_IMAGES.map((path) => getR2Url(path));
    return NextResponse.json({ urls });
  } catch (e) {
    console.error("[verified-bg-url]", e);
    return NextResponse.json(
      { error: "Failed to get verified background URL" },
      { status: 500 }
    );
  }
}
