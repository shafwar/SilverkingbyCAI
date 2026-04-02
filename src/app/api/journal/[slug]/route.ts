/**
 * Public API: single journal post by slug. Locale from query (id|en).
 * GET /api/journal/[slug]?locale=id
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/r2-client";

export const dynamic = "force-dynamic";

type Locale = "id" | "en";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get("locale") ?? "en").trim().toLowerCase();
    const lang: Locale = locale === "id" ? "id" : "en";

    const j = await prisma.journal.findUnique({
      where: { slug: slug.trim() },
    });

    if (!j) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const title = lang === "id" ? j.titleId : j.titleEn;
    const content = lang === "id" ? j.contentId : j.contentEn;
    const excerpt = lang === "id" ? j.excerptId : j.excerptEn;

    return NextResponse.json({
      slug: j.slug,
      title,
      content,
      excerpt: excerpt && excerpt.trim() ? excerpt : null,
      heroImageUrl: j.heroImageR2Key ? getPublicUrl(j.heroImageR2Key) : null,
      publishedAt: j.publishedAt?.toISOString() ?? null,
    }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e) {
    console.error("[journal slug]", e);
    return NextResponse.json({ error: "Failed to load article" }, { status: 500 });
  }
}
