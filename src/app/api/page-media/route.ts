/**
 * Public API: get hero media URLs for a page.
 * GET /api/page-media?page=distributor
 * Returns heroImageUrl, heroVideoUrl (from R2 if set in PageMedia, else null).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/r2-client";
import { getR2Url } from "@/utils/r2-url";

const DEFAULT_HERO_IMAGE_BY_PAGE: Record<string, string> = {
  distributor: "/images/DSC02998.JPG",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page")?.trim();
    if (!page) {
      return NextResponse.json(
        { error: "Missing page query parameter" },
        { status: 400 }
      );
    }

    const row = await prisma.pageMedia.findUnique({
      where: { pageName: page },
    });

    const defaultImage = DEFAULT_HERO_IMAGE_BY_PAGE[page];
    const heroImageUrl = row?.heroImageR2Key
      ? getPublicUrl(row.heroImageR2Key)
      : defaultImage
        ? getR2Url(defaultImage)
        : null;
    const heroVideoUrl = row?.heroVideoR2Key
      ? getPublicUrl(row.heroVideoR2Key)
      : null;

    return NextResponse.json({
      page,
      heroImageUrl: heroImageUrl || null,
      heroVideoUrl,
    });
  } catch (error) {
    console.error("[PAGE_MEDIA_GET]", error);
    return NextResponse.json(
      { error: "Failed to load page media" },
      { status: 500 }
    );
  }
}
