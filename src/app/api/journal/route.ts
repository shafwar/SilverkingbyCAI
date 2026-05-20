/**
 * Public API: list published journal posts. Locale from query (id|en).
 * GET /api/journal?locale=id
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/r2-client";

export const dynamic = "force-dynamic";

type Locale = "id" | "en";

function pickTitle(j: { titleId: string; titleEn: string }, locale: Locale): string {
  return locale === "id" ? j.titleId : j.titleEn;
}
function pickExcerpt(j: { excerptId: string | null; excerptEn: string | null }, locale: Locale): string | null {
  const s = locale === "id" ? j.excerptId : j.excerptEn;
  return s && s.trim() ? s : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = (searchParams.get("locale") ?? "en").trim().toLowerCase();
    const lang: Locale = locale === "id" ? "id" : "en";

    const list = await prisma.journal.findMany({
      where: { publishedAt: { not: null } },
      /** Newest article date first; tie-break by publish time then id */
      orderBy: [{ articleDate: "desc" }, { publishedAt: "desc" }, { id: "desc" }],
      select: {
        slug: true,
        titleId: true,
        titleEn: true,
        excerptId: true,
        excerptEn: true,
        heroImageR2Key: true,
        publishedAt: true,
        articleDate: true,
      },
    });

    const items = list.map((j) => {
      const displayDate = (j.articleDate ?? j.publishedAt)?.toISOString() ?? null;
      return {
        slug: j.slug,
        title: pickTitle(j, lang),
        excerpt: pickExcerpt(j, lang),
        heroImageUrl: j.heroImageR2Key ? getPublicUrl(j.heroImageR2Key) : null,
        publishedAt: j.publishedAt?.toISOString() ?? null,
        displayDate,
      };
    });

    return NextResponse.json({ items }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e) {
    console.error("[journal list]", e);
    return NextResponse.json({ error: "Failed to load journal" }, { status: 500 });
  }
}
