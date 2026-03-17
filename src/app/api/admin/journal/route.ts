/**
 * Admin API: list and create journal posts (bilingual).
 * GET: list all
 * POST: create (titleId, titleEn, contentId, contentEn, excerptId?, excerptEn?, slug, heroImageR2Key?, publishedAt?, sortOrder?)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_TITLE_LEN = 500;
const MAX_EXCERPT_LEN = 1000;

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "post";
}

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await prisma.journal.findMany({
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ items: list });
  } catch (e) {
    console.error("[ADMIN_JOURNAL_GET]", e);
    return NextResponse.json({ error: "Failed to load journal" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      slug: rawSlug,
      titleId,
      titleEn,
      contentId,
      contentEn,
      excerptId,
      excerptEn,
      heroImageR2Key,
      publishedAt,
      sortOrder,
    } = body ?? {};

    const titleIdS = String(titleId ?? "").trim();
    const titleEnS = String(titleEn ?? "").trim();
    const contentIdS = String(contentId ?? "").trim();
    const contentEnS = String(contentEn ?? "").trim();
    if (!titleIdS || !titleEnS || !contentIdS || !contentEnS) {
      return NextResponse.json(
        { error: "titleId, titleEn, contentId, contentEn are required" },
        { status: 400 }
      );
    }
    if (titleIdS.length > MAX_TITLE_LEN || titleEnS.length > MAX_TITLE_LEN) {
      return NextResponse.json(
        { error: `Title too long. Max ${MAX_TITLE_LEN} characters for each language.` },
        { status: 400 }
      );
    }

    const excerptIdS = excerptId != null ? String(excerptId).trim() : "";
    const excerptEnS = excerptEn != null ? String(excerptEn).trim() : "";
    if ((!!excerptIdS) !== (!!excerptEnS)) {
      return NextResponse.json(
        { error: "excerptId and excerptEn must both be filled (or both empty)" },
        { status: 400 }
      );
    }
    if (excerptIdS.length > MAX_EXCERPT_LEN || excerptEnS.length > MAX_EXCERPT_LEN) {
      return NextResponse.json(
        { error: `Excerpt too long. Max ${MAX_EXCERPT_LEN} characters for each language.` },
        { status: 400 }
      );
    }

    const slug = rawSlug && String(rawSlug).trim() ? slugify(String(rawSlug).trim()) : slugify(titleEnS || titleIdS);
    const existing = await prisma.journal.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "Slug already exists. Use a unique slug." },
        { status: 400 }
      );
    }

    const publishedAtDate =
      publishedAt === true || publishedAt === "true" || (typeof publishedAt === "string" && publishedAt.trim())
        ? new Date(publishedAt === true || publishedAt === "true" ? Date.now() : publishedAt)
        : null;

    const created = await prisma.journal.create({
      data: {
        slug,
        titleId: titleIdS,
        titleEn: titleEnS,
        contentId: contentIdS,
        contentEn: contentEnS,
        excerptId: excerptIdS ? excerptIdS : null,
        excerptEn: excerptEnS ? excerptEnS : null,
        heroImageR2Key: heroImageR2Key && String(heroImageR2Key).trim() ? String(heroImageR2Key).trim() : null,
        publishedAt: publishedAtDate,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });

    return NextResponse.json({ item: created });
  } catch (e) {
    console.error("[ADMIN_JOURNAL_POST]", e);
    return NextResponse.json({ error: "Failed to create journal" }, { status: 500 });
  }
}
