/**
 * Admin API: update and delete journal post.
 * PATCH: update (any of slug, titleId, titleEn, contentId, contentEn, excerptId?, excerptEn?, heroImageR2Key?, publishedAt?, sortOrder?)
 * DELETE: delete
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import sanitizeHtml from "sanitize-html";

const MAX_TITLE_LEN = 500;
const MAX_EXCERPT_LEN = 1000;

function sanitizeJournalHtml(input: string): string {
  const raw = String(input ?? "");
  return sanitizeHtml(raw, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "h1", "h2", "h3",
      "blockquote",
      "ul", "ol", "li",
      "code", "pre",
      "a",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  }).trim();
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const existing = await prisma.journal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updates: {
      slug?: string;
      titleId?: string;
      titleEn?: string;
      contentId?: string;
      contentEn?: string;
      excerptId?: string | null;
      excerptEn?: string | null;
      heroImageR2Key?: string | null;
      publishedAt?: Date | null;
      sortOrder?: number;
    } = {};

    if (body.slug !== undefined) updates.slug = slugify(String(body.slug).trim()) || existing.slug;
    if (body.titleId !== undefined) updates.titleId = String(body.titleId).trim();
    if (body.titleEn !== undefined) updates.titleEn = String(body.titleEn).trim();
    if (body.contentId !== undefined) updates.contentId = sanitizeJournalHtml(String(body.contentId ?? ""));
    if (body.contentEn !== undefined) updates.contentEn = sanitizeJournalHtml(String(body.contentEn ?? ""));
    if (body.excerptId !== undefined) updates.excerptId = body.excerptId == null || body.excerptId === "" ? null : String(body.excerptId).trim();
    if (body.excerptEn !== undefined) updates.excerptEn = body.excerptEn == null || body.excerptEn === "" ? null : String(body.excerptEn).trim();
    if (body.heroImageR2Key !== undefined) updates.heroImageR2Key = body.heroImageR2Key == null || body.heroImageR2Key === "" ? null : String(body.heroImageR2Key).trim();
    if (body.sortOrder !== undefined) updates.sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : existing.sortOrder;
    if (body.publishedAt !== undefined) {
      if (body.publishedAt === null || body.publishedAt === false || body.publishedAt === "false" || body.publishedAt === "") {
        updates.publishedAt = null;
      } else {
        updates.publishedAt = body.publishedAt === true || body.publishedAt === "true"
          ? new Date()
          : new Date(body.publishedAt);
      }
    }

    if (updates.slug && updates.slug !== existing.slug) {
      const conflict = await prisma.journal.findUnique({ where: { slug: updates.slug } });
      if (conflict) {
        return NextResponse.json({ error: "Slug already in use" }, { status: 400 });
      }
    }

    // Enforce bilingual fields stay complete after patch (production safety)
    const finalTitleId = (updates.titleId ?? existing.titleId).trim();
    const finalTitleEn = (updates.titleEn ?? existing.titleEn).trim();
    const finalContentId = (updates.contentId ?? existing.contentId).trim();
    const finalContentEn = (updates.contentEn ?? existing.contentEn).trim();
    if (!finalTitleId || !finalTitleEn || !finalContentId || !finalContentEn) {
      return NextResponse.json(
        { error: "titleId, titleEn, contentId, contentEn must not be empty" },
        { status: 400 }
      );
    }
    if (finalTitleId.length > MAX_TITLE_LEN || finalTitleEn.length > MAX_TITLE_LEN) {
      return NextResponse.json(
        { error: `Title too long. Max ${MAX_TITLE_LEN} characters for each language.` },
        { status: 400 }
      );
    }

    const finalExcerptId = (updates.excerptId !== undefined ? updates.excerptId : existing.excerptId) ?? null;
    const finalExcerptEn = (updates.excerptEn !== undefined ? updates.excerptEn : existing.excerptEn) ?? null;
    const hasExcerptId = !!(finalExcerptId && finalExcerptId.trim());
    const hasExcerptEn = !!(finalExcerptEn && finalExcerptEn.trim());
    if (hasExcerptId !== hasExcerptEn) {
      return NextResponse.json(
        { error: "excerptId and excerptEn must both be filled (or both empty)" },
        { status: 400 }
      );
    }
    if ((finalExcerptId?.trim().length ?? 0) > MAX_EXCERPT_LEN || (finalExcerptEn?.trim().length ?? 0) > MAX_EXCERPT_LEN) {
      return NextResponse.json(
        { error: `Excerpt too long. Max ${MAX_EXCERPT_LEN} characters for each language.` },
        { status: 400 }
      );
    }

    const updated = await prisma.journal.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ item: updated });
  } catch (e) {
    console.error("[ADMIN_JOURNAL_PATCH]", e);
    return NextResponse.json({ error: "Failed to update journal" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await prisma.journal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ADMIN_JOURNAL_DELETE]", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
