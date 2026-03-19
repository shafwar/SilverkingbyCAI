/**
 * Admin API: list and create journal posts (bilingual).
 * GET: list all
 * POST: create (titleId, titleEn, contentId, contentEn, excerptId?, excerptEn?, slug, heroImageR2Key?, publishedAt?, sortOrder?)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import sanitizeHtml from "sanitize-html";

const MAX_TITLE_LEN = 500;
const MAX_EXCERPT_LEN = 1000;

function sanitizeJournalHtml(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "blockquote",
      "ul",
      "ol",
      "li",
      "h2",
      "h3",
      "a",
      "img",
      "code",
      "pre",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "loading"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "data"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
      img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }),
    },
  });
}

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
    const contentIdS = sanitizeJournalHtml(String(contentId ?? "")).trim();
    const contentEnS = sanitizeJournalHtml(String(contentEn ?? "")).trim();

    // Simple bilingual input:
    // - admin may fill only one language
    // - missing language falls back to the filled one
    if (!titleIdS && !titleEnS) {
      return NextResponse.json({ error: "At least one title is required (ID or EN)." }, { status: 400 });
    }
    if (!contentIdS && !contentEnS) {
      return NextResponse.json({ error: "At least one content is required (ID or EN)." }, { status: 400 });
    }

    const finalTitleId = titleIdS || titleEnS;
    const finalTitleEn = titleEnS || titleIdS;
    const finalContentId = contentIdS || contentEnS;
    const finalContentEn = contentEnS || contentIdS;

    if (finalTitleId.length > MAX_TITLE_LEN || finalTitleEn.length > MAX_TITLE_LEN) {
      return NextResponse.json(
        { error: `Title too long. Max ${MAX_TITLE_LEN} characters for each language.` },
        { status: 400 }
      );
    }

    const excerptIdS = excerptId != null ? String(excerptId).trim() : "";
    const excerptEnS = excerptEn != null ? String(excerptEn).trim() : "";
    const finalExcerptId = excerptIdS || excerptEnS || "";
    const finalExcerptEn = excerptEnS || excerptIdS || "";
    if (finalExcerptId.length > MAX_EXCERPT_LEN || finalExcerptEn.length > MAX_EXCERPT_LEN) {
      return NextResponse.json(
        { error: `Excerpt too long. Max ${MAX_EXCERPT_LEN} characters for each language.` },
        { status: 400 }
      );
    }

    const slug = rawSlug && String(rawSlug).trim() ? slugify(String(rawSlug).trim()) : slugify(finalTitleEn || finalTitleId);
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
        titleId: finalTitleId,
        titleEn: finalTitleEn,
        contentId: finalContentId,
        contentEn: finalContentEn,
        excerptId: finalExcerptId ? finalExcerptId : null,
        excerptEn: finalExcerptEn ? finalExcerptEn : null,
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
