/**
 * Returns up to 7 product image URLs from CMS (same images as Products page, in R2).
 * Used as verified-success background options. No auth required (public).
 * GET /api/verified-bg-images
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getR2Url } from "@/utils/r2-url";

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

    return NextResponse.json({ urls });
  } catch (e) {
    console.error("[verified-bg-images]", e);
    return NextResponse.json({ urls: [] }, { status: 200 });
  }
}
