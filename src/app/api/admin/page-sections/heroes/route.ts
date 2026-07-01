/**
 * Admin API: list hero assets for all CMS-managed pages.
 * GET /api/admin/page-sections/heroes
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/r2-client";
import {
  PAGE_HERO_CMS_SLUGS,
  PAGE_HERO_CMS_CONFIG,
  HERO_POSTER_SECTION_KEY,
  type PageHeroCmsSlug,
} from "@/lib/page-hero-cms-config";
import { getR2UrlClient } from "@/utils/r2-url";

export const dynamic = "force-dynamic";

function fallbackMediaUrl(slug: PageHeroCmsSlug): string {
  const cfg = PAGE_HERO_CMS_CONFIG[slug];
  if (cfg.mediaType === "IMAGE" && cfg.imagePath) {
    return getR2UrlClient(cfg.imagePath);
  }
  return cfg.videoPath ? getR2UrlClient(cfg.videoPath) : "";
}

function fallbackPosterUrl(slug: PageHeroCmsSlug): string {
  return getR2UrlClient(PAGE_HERO_CMS_CONFIG[slug].posterPath);
}

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.pageSection.findMany({
      where: {
        pageName: { in: [...PAGE_HERO_CMS_SLUGS] },
        sectionKey: { in: ["hero", HERO_POSTER_SECTION_KEY] },
      },
    });

    const byPage = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = byPage.get(row.pageName) ?? [];
      list.push(row);
      byPage.set(row.pageName, list);
    }

    const heroes = PAGE_HERO_CMS_SLUGS.map((slug) => {
      const pageRows = byPage.get(slug) ?? [];
      const heroRow = pageRows.find((r) => r.sectionKey === "hero");
      const posterRow = pageRows.find((r) => r.sectionKey === HERO_POSTER_SECTION_KEY);
      const cfg = PAGE_HERO_CMS_CONFIG[slug];

      const cmsActive = Boolean(heroRow?.r2Key);
      const mediaType = (heroRow?.mediaType?.toUpperCase() ?? cfg.mediaType) as
        | "VIDEO"
        | "IMAGE";

      const posterUrl = posterRow?.r2Key
        ? getPublicUrl(posterRow.r2Key)
        : heroRow?.mediaType?.toUpperCase() === "IMAGE" && heroRow.r2Key
          ? getPublicUrl(heroRow.r2Key)
          : null;
      const fallbackPoster = fallbackPosterUrl(slug);
      const fallbackMedia = fallbackMediaUrl(slug);
      const activeMediaUrl = heroRow?.r2Key ? getPublicUrl(heroRow.r2Key) : null;

      return {
        page: slug,
        label: cfg.label,
        defaultMediaType: cfg.mediaType,
        mediaType,
        cmsActive,
        mediaUrl: activeMediaUrl,
        posterUrl,
        previewPosterUrl: posterUrl ?? fallbackPoster,
        previewMediaUrl: cmsActive && activeMediaUrl ? activeMediaUrl : fallbackMedia,
        fallbackMediaUrl: fallbackMedia,
        fallbackPosterUrl: fallbackPoster,
        updatedAt: heroRow?.updatedAt?.toISOString() ?? null,
        version: heroRow?.updatedAt?.getTime() ?? cfg.assetVersion,
      };
    });

    return NextResponse.json({ heroes });
  } catch (error) {
    console.error("[ADMIN_PAGE_SECTIONS_HEROES]", error);
    return NextResponse.json({ error: "Failed to load hero assets." }, { status: 500 });
  }
}
