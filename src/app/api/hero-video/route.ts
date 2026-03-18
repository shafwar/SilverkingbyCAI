/**
 * GET /api/hero-video?page=journal
 * GET /api/hero-video?key=<R2 object key>
 *
 * Proxy hero video so:
 * - browser always receives correct Content-Type
 * - playback behavior is consistent (especially for mp4 from R2)
 * - we can fallback to local public asset if the R2 object is missing
 */
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";
import { getObjectStreamFromR2 } from "@/lib/r2-client";

const PAGE_TO_R2_KEY: Record<string, string> = {
  journal: "static/videos/hero/Jurnal Silverking.mp4",
};

const PAGE_TO_PUBLIC_PATH: Record<string, string> = {
  journal: "videos/hero/Jurnal Silverking.mp4",
};

function getContentTypeFromExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".ogg") return "video/ogg";
  if (ext === ".mov") return "video/quicktime";
  return "application/octet-stream";
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const pageParam = request.nextUrl.searchParams.get("page")?.trim().toLowerCase();
  const keyParam = request.nextUrl.searchParams.get("key")?.trim();

  // Support explicit key first (used when CMS provides a R2 url).
  if (keyParam) {
    const result = await getObjectStreamFromR2(keyParam);
    if (result) {
      const webStream = Readable.toWeb(result.body) as ReadableStream<Uint8Array>;
      return new NextResponse(webStream, {
        headers: {
          "Content-Type": result.contentType ?? "video/mp4",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // If the R2 object is not available yet, fallback to bundled local asset.
    // This is important because the client expects a valid video response
    // (not HTML/JSON 404), otherwise VideoLoadGuard will stay opacity=0.
    const isJournalFallback =
      keyParam.includes("Jurnal Silverking.mp4") || keyParam.includes("Jurnal%20Silverking.mp4");
    const fallbackPage = pageParam === "journal" || isJournalFallback ? "journal" : null;
    if (fallbackPage && PAGE_TO_PUBLIC_PATH[fallbackPage]) {
      const publicRel = PAGE_TO_PUBLIC_PATH[fallbackPage];
      const publicPath = path.join(process.cwd(), "public", publicRel);
      if (fs.existsSync(publicPath)) {
        const ext = path.extname(publicPath).toLowerCase();
        const contentType =
          ext === ".mp4"
            ? "video/mp4"
            : ext === ".webm"
              ? "video/webm"
              : ext === ".ogg"
                ? "video/ogg"
                : getContentTypeFromExt(publicPath);
        const buffer = fs.readFileSync(publicPath);
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }

    return NextResponse.json({ error: "Video not found in R2" }, { status: 404 });
  }

  if (!pageParam || !PAGE_TO_R2_KEY[pageParam]) {
    return NextResponse.json(
      { error: "Missing or invalid page (use ?page=journal or ?key=<r2Key>)" },
      { status: 400 }
    );
  }

  const r2Key = PAGE_TO_R2_KEY[pageParam];
  const result = await getObjectStreamFromR2(r2Key);
  if (result) {
    const webStream = Readable.toWeb(result.body) as ReadableStream<Uint8Array>;
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": result.contentType ?? getContentTypeFromExt(r2Key),
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Local fallback from public/
  const publicRel = PAGE_TO_PUBLIC_PATH[pageParam];
  const publicPath = path.join(process.cwd(), "public", publicRel);
  if (!fs.existsSync(publicPath)) {
    return NextResponse.json({ error: "Hero video not found in R2 or public" }, { status: 404 });
  }

  const ext = path.extname(publicPath).toLowerCase();
  const contentType =
    ext === ".mp4"
      ? "video/mp4"
      : ext === ".webm"
        ? "video/webm"
        : ext === ".ogg"
          ? "video/ogg"
          : getContentTypeFromExt(publicPath);

  const buffer = fs.readFileSync(publicPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

