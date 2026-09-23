/**
 * Admin API: promote current CMS hero to built-in default (canonical R2 path), then clear CMS override.
 * POST body: { page: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { copyInR2 } from "@/lib/r2-client";
import {
  PAGE_HERO_CMS_CONFIG,
  HERO_POSTER_SECTION_KEY,
  publicPathToCanonicalR2Key,
  type PageHeroCmsSlug,
} from "@/lib/page-hero-cms-config";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const page = String(body?.page ?? "").trim() as PageHeroCmsSlug;
    const cfg = PAGE_HERO_CMS_CONFIG[page];
    if (!cfg) {
      return NextResponse.json({ error: "Unknown page" }, { status: 400 });
    }

    const rows = await prisma.pageSection.findMany({
      where: {
        pageName: page,
        sectionKey: { in: ["hero", HERO_POSTER_SECTION_KEY] },
      },
    });
    const heroRow = rows.find((r) => r.sectionKey === "hero");
    const posterRow = rows.find((r) => r.sectionKey === HERO_POSTER_SECTION_KEY);

    if (!heroRow?.r2Key) {
      return NextResponse.json(
        { error: "No CMS hero to promote. Upload a hero first or use an active CMS asset." },
        { status: 400 }
      );
    }

    const mediaPath =
      cfg.mediaType === "IMAGE" && cfg.imagePath
        ? cfg.imagePath
        : cfg.videoPath;
    if (!mediaPath) {
      return NextResponse.json({ error: "Page has no canonical media path configured." }, { status: 400 });
    }

    const canonicalMediaKey = publicPathToCanonicalR2Key(mediaPath);
    await copyInR2(heroRow.r2Key, canonicalMediaKey);

    if (posterRow?.r2Key) {
      const canonicalPosterKey = publicPathToCanonicalR2Key(cfg.posterPath);
      await copyInR2(posterRow.r2Key, canonicalPosterKey);
    }

    await prisma.pageSection.deleteMany({
      where: {
        pageName: page,
        sectionKey: { in: ["hero", HERO_POSTER_SECTION_KEY] },
      },
    });

    return NextResponse.json({
      ok: true,
      page,
      canonicalMediaKey,
      message: "Current hero promoted to site default. CMS override cleared.",
    });
  } catch (error) {
    console.error("[ADMIN_PAGE_SECTIONS_PROMOTE_DEFAULT]", error);
    return NextResponse.json({ error: "Failed to promote hero as default." }, { status: 500 });
  }
}
