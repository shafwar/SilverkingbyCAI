/**
 * Returns up to 7 product image URLs from CMS (same images as Products page, in R2).
 * Used as verified-success background options. No auth required (public).
 * GET /api/verified-bg-images
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getR2Url } from "@/utils/r2-url";
import { VERIFIED_BG_IMAGES } from "@/assets/verified-bg";

const MAX_IMAGES = 7;

function toAbsoluteUrl(url: string): string {
  if (typeof url !== "string" || !url.trim()) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return getR2Url(path);
}

export async function GET() {
  try {
    const db = prisma as any;
    const products = await db.cmsProduct.findMany({
      orderBy: { createdAt: "desc" },
      take: MAX_IMAGES,
      select: { images: true },
    });

    const urls: string[] = [];
    const seen = new Set<string>();

    for (const p of products) {
      if (urls.length >= MAX_IMAGES) break;
      const images = Array.isArray(p?.images) ? p.images : [];
      const first = images[0];
      if (first == null) continue;
      const resolved = toAbsoluteUrl(String(first));
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved);
        urls.push(resolved);
      }
    }

    // Always include static fallbacks so this API never returns empty.
    for (const p of VERIFIED_BG_IMAGES) {
      if (urls.length >= MAX_IMAGES) break;
      const resolved = toAbsoluteUrl(p);
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved);
        urls.push(resolved);
      }
    }

    const res = NextResponse.json({ urls });
    // Cache at the edge for stability/perf; background options can be slightly stale.
    res.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res;
  } catch (e) {
    console.error("[verified-bg-images]", e);
    // Even on error, return static fallbacks so verify page always has candidates.
    const fallback = VERIFIED_BG_IMAGES.map((p) => toAbsoluteUrl(p)).filter(Boolean).slice(0, MAX_IMAGES);
    const res = NextResponse.json({ urls: fallback }, { status: 200 });
    res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    return res;
  }
}
