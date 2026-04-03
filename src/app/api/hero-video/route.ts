/**
 * GET /api/hero-video?page=journal
 * GET /api/hero-video?key=<R2 object key>
 *
 * Proxy hero video with **HTTP Range** support. Safari/iOS requires
 * Accept-Ranges + 206 Partial Content for MP4; without it video often never decodes
 * and stays invisible (opacity 0 in VideoLoadGuard).
 */
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";
import {
  getObjectStreamFromR2,
  headObjectFromR2,
  getObjectByteRangeFromR2,
} from "@/lib/r2-client";

const PAGE_TO_R2_KEY: Record<string, string> = {
  journal: "static/videos/hero/Jurnal Silverking.mp4",
};

const PAGE_TO_PUBLIC_PATH: Record<string, string> = {
  journal: "videos/hero/Jurnal Silverking.mp4",
};

const CACHE_HEADER = "public, max-age=3600";

function getContentTypeFromExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".ogg") return "video/ogg";
  if (ext === ".mov") return "video/quicktime";
  return "application/octet-stream";
}

/** Parse single Range: bytes=… per RFC 7233 (no multi-range). */
function parseHttpRange(
  rangeHeader: string,
  fileSize: number
): { start: number; end: number } | "invalid" {
  if (fileSize <= 0) return "invalid";
  const trimmed = rangeHeader.trim();
  if (!/^bytes=/i.test(trimmed)) return "invalid";
  const spec = trimmed.slice(trimmed.indexOf("=") + 1).trim();
  if (spec.includes(",")) return "invalid";

  if (spec.startsWith("-")) {
    const suffix = parseInt(spec.slice(1), 10);
    if (Number.isNaN(suffix) || suffix < 1) return "invalid";
    if (suffix >= fileSize) return { start: 0, end: fileSize - 1 };
    return { start: fileSize - suffix, end: fileSize - 1 };
  }

  const dash = spec.indexOf("-");
  const startStr = dash >= 0 ? spec.slice(0, dash) : spec;
  const endStr = dash >= 0 ? spec.slice(dash + 1) : "";
  const start = startStr === "" ? 0 : parseInt(startStr, 10);
  const end = endStr === "" ? fileSize - 1 : parseInt(endStr, 10);
  if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end < 0) return "invalid";
  if (start >= fileSize) return "invalid";
  const endClamped = Math.min(end, fileSize - 1);
  if (start > endClamped) return "invalid";
  return { start, end: endClamped };
}

function responseFromBuffer(
  buf: Buffer,
  contentType: string,
  request: NextRequest
): NextResponse {
  const size = buf.length;
  const rawRange = request.headers.get("range");
  if (!rawRange) {
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(size),
        "Accept-Ranges": "bytes",
        "Cache-Control": CACHE_HEADER,
      },
    });
  }
  const parsed = parseHttpRange(rawRange, size);
  if (parsed === "invalid") {
    return new NextResponse(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }
  const { start, end } = parsed;
  const chunk = buf.subarray(start, end + 1);
  return new NextResponse(new Uint8Array(chunk), {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(chunk.length),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": CACHE_HEADER,
    },
  });
}

async function serveR2Key(key: string, request: NextRequest): Promise<NextResponse | null> {
  const meta = await headObjectFromR2(key);
  if (!meta) return null;

  const contentType = meta.contentType ?? "video/mp4";
  const total = meta.contentLength;
  const rawRange = request.headers.get("range");

  if (!rawRange) {
    const res = await getObjectStreamFromR2(key);
    if (!res) return null;
    const webStream = Readable.toWeb(res.body) as ReadableStream<Uint8Array>;
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": res.contentType ?? contentType,
        "Content-Length": String(total),
        "Accept-Ranges": "bytes",
        "Cache-Control": CACHE_HEADER,
      },
    });
  }

  const parsed = parseHttpRange(rawRange, total);
  if (parsed === "invalid") {
    return new NextResponse(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${total}` },
    });
  }
  const { start, end } = parsed;
  const partial = await getObjectByteRangeFromR2(key, start, end);
  if (!partial) return null;
  const chunkLen = end - start + 1;
  const webStream = Readable.toWeb(partial.body) as ReadableStream<Uint8Array>;
  return new NextResponse(webStream, {
    status: 206,
    headers: {
      "Content-Type": partial.contentType ?? contentType,
      "Content-Length": String(chunkLen),
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": CACHE_HEADER,
    },
  });
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const pageParam = request.nextUrl.searchParams.get("page")?.trim().toLowerCase();
  const keyParam = request.nextUrl.searchParams.get("key")?.trim();

  if (keyParam) {
    const r2Res = await serveR2Key(keyParam, request);
    if (r2Res) return r2Res;

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
        return responseFromBuffer(buffer, contentType, request);
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
  const served = await serveR2Key(r2Key, request);
  if (served) return served;

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
  return responseFromBuffer(buffer, contentType, request);
}
