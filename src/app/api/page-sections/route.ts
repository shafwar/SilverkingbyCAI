/**
 * Public API: get all section media for a page.
 * GET /api/page-sections?page=home
 * Returns { sections: Record<string, { url: string; mediaType: string }> }
 * force-dynamic so uploads always see fresh data (no cached response).
 */
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/r2-client";

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

    const rows = await prisma.pageSection.findMany({
      where: { pageName: page },
    });

    const sections: Record<string, { url: string; mediaType: string }> = {};
    for (const row of rows) {
      if (row.r2Key) {
        sections[row.sectionKey] = {
          url: getPublicUrl(row.r2Key),
          mediaType: row.mediaType,
        };
      }
    }

    return NextResponse.json({ page, sections }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[PAGE_SECTIONS_GET]", error);
    return NextResponse.json(
      { error: "Failed to load page sections" },
      { status: 500 }
    );
  }
}
