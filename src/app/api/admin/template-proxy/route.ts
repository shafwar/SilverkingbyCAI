import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSerticardVariant,
  isValidSerticardVariant,
  DEFAULT_SERTICARD_VARIANT,
  getLocalTemplateFilename,
  getR2TemplateKey,
} from "@/utils/serticard-templates";

/** In-memory cache: key = "template-variant" (e.g. "front-01"), value = { buffer, contentType } */
const templateBufferCache = new Map<string, { buffer: ArrayBuffer; contentType: string }>();

function cacheKey(template: string, variantId: string): string {
  return `${template}-${variantId}`;
}

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

/**
 * Proxy endpoint for serticard templates
 * Fetches template from R2 (or local) and serves with CORS; caches in memory for fast repeat requests
 * Query: template=front|back, variant=01|03|05|... (default 01)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const template = searchParams.get("template"); // "front" or "back"
    const variantParam = searchParams.get("variant") || DEFAULT_SERTICARD_VARIANT;

    if (!template || (template !== "front" && template !== "back")) {
      return NextResponse.json({ error: "Invalid template parameter" }, { status: 400 });
    }

    const variantId = isValidSerticardVariant(variantParam) ? variantParam : DEFAULT_SERTICARD_VARIANT;
    const key = cacheKey(template, variantId);

    // Return from memory cache immediately if present (fast path)
    const cached = templateBufferCache.get(key);
    if (cached) {
      return new NextResponse(cached.buffer, {
        status: 200,
        headers: { "Content-Type": cached.contentType, ...CACHE_HEADERS },
      });
    }

    const variant = getSerticardVariant(variantId)!;
    const num = template === "front" ? variant.frontNum : variant.backNum;
    const ext = variant.ext;
    const fallbackPath = `/${variant.localBase}/${getLocalTemplateFilename(num, ext)}`;
    const r2Key = getR2TemplateKey(num, ext);

    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
    const isLocalDev = process.env.NODE_ENV === "development" || !R2_PUBLIC_URL;

    const contentType = ext === "png" ? "image/png" : "image/jpeg";

    // Try R2 first
    if (!isLocalDev && R2_PUBLIC_URL) {
      const base = R2_PUBLIC_URL.endsWith("/") ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
      const templateUrl = `${base}/${r2Key}`;
      try {
        const response = await fetch(templateUrl, {
          headers: { "User-Agent": "SilverKing-Server/1.0" },
        });

        if (response.ok) {
          const imageBuffer = await response.arrayBuffer();
          templateBufferCache.set(key, { buffer: imageBuffer, contentType });
          return new NextResponse(imageBuffer, {
            status: 200,
            headers: { "Content-Type": contentType, ...CACHE_HEADERS },
          });
        }
      } catch (r2Error) {
        console.warn(`[Template Proxy] R2 failed (${templateUrl}), fallback local:`, r2Error);
      }
    }

    // Fallback to local file
    const fs = await import("fs/promises");
    const path = await import("path");
    const localPath = path.join(process.cwd(), "public", fallbackPath);

    try {
      const fileBuffer = await fs.readFile(localPath);
      const imageBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );
      templateBufferCache.set(key, { buffer: imageBuffer, contentType });
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600, must-revalidate",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } catch (localError) {
      console.error(`[Template Proxy] Local file failed (${localPath}):`, localError);
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("[Template Proxy] Error:", error);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

