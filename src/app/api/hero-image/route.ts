/**
 * GET /api/hero-image?page=journal
 * Streams hero image from R2 (real R2 endpoint); falls back to public/ if not in R2 so asset always appears.
 * Client loads same-origin so onLoad fires and opacity becomes 1.
 */
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";
import { getObjectStreamFromR2 } from "@/lib/r2-client";

const PAGE_TO_R2_KEY: Record<string, string> = {
  journal: "static/images/hero-fallback.jpg",
  distributor: "static/images/DSC02998.JPG",
};

const PAGE_TO_PUBLIC_PATH: Record<string, string> = {
  journal: "images/hero-fallback.jpg",
  distributor: "images/DSC02998.JPG",
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get("page")?.trim();
  if (!page || !PAGE_TO_R2_KEY[page]) {
    return NextResponse.json(
      { error: "Missing or invalid page (use ?page=journal or ?page=distributor)" },
      { status: 400 }
    );
  }

  const key = PAGE_TO_R2_KEY[page];
  const result = await getObjectStreamFromR2(key);
  if (result) {
    const webStream = Readable.toWeb(result.body) as ReadableStream<Uint8Array>;
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": result.contentType ?? "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const publicRel = PAGE_TO_PUBLIC_PATH[page];
  if (!publicRel) {
    return NextResponse.json({ error: "Hero image not found" }, { status: 404 });
  }
  const publicPath = path.join(process.cwd(), "public", publicRel);
  if (!fs.existsSync(publicPath)) {
    return NextResponse.json({ error: "Hero image not found in R2 or public" }, { status: 404 });
  }
  const buffer = fs.readFileSync(publicPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
