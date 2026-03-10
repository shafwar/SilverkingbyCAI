/**
 * Admin API: restore section to default (remove custom media).
 * POST body: { page: string, section: string }
 * Deletes the PageSection row so GET returns no url and frontend uses fallback.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const page = String(body?.page ?? "").trim();
    const section = String(body?.section ?? "").trim();

    if (!page || !section) {
      return NextResponse.json(
        { error: "Missing page or section" },
        { status: 400 }
      );
    }

    await prisma.pageSection.deleteMany({
      where: {
        pageName: page,
        sectionKey: section,
      },
    });

    return NextResponse.json({ ok: true, page, section });
  } catch (error) {
    console.error("[ADMIN_PAGE_SECTIONS_RESTORE]", error);
    return NextResponse.json(
      { error: "Failed to restore section." },
      { status: 500 }
    );
  }
}
