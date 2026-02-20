/**
 * Admin API: list and create content entries (bilingual CMS).
 * GET: list all or by page
 * POST: create with optional auto-translation
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateBilingual, isTranslationAvailable } from "@/lib/translation";
import type { BilingualText, TranslationMeta } from "@/lib/translation";

function asBilingual(v: unknown): BilingualText {
  if (v && typeof v === "object" && "id" in v && "en" in v) {
    return {
      id: String((v as BilingualText).id),
      en: String((v as BilingualText).en),
    };
  }
  return { id: "", en: "" };
}

function asMeta(v: unknown): TranslationMeta | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, boolean>;
  return {
    titleIdAuto: o.titleIdAuto,
    titleEnAuto: o.titleEnAuto,
    descriptionIdAuto: o.descriptionIdAuto,
    descriptionEnAuto: o.descriptionEnAuto,
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");

    const where = page?.trim() ? { pageName: page.trim() } : {};
    const entries = await prisma.contentEntry.findMany({
      where,
      orderBy: [{ pageName: "asc" }, { sectionName: "asc" }],
    });

    const list = entries.map((e) => ({
      id: e.id,
      pageName: e.pageName,
      sectionName: e.sectionName,
      title: asBilingual(e.title),
      description: e.description ? asBilingual(e.description) : null,
      translationMeta: asMeta(e.translationMeta),
      createdBy: e.createdBy,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return NextResponse.json({ entries: list, translationAvailable: isTranslationAvailable() });
  } catch (error) {
    console.error("[ADMIN_CONTENT_GET]", error);
    return NextResponse.json(
      { error: "Failed to load content" },
      { status: 500 }
    );
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
      pageName,
      sectionName,
      title,
      description,
      translationMeta,
      autoTranslate,
    } = body || {};

    if (!pageName?.trim() || !sectionName?.trim()) {
      return NextResponse.json(
        { error: "pageName and sectionName are required" },
        { status: 400 }
      );
    }

    let titleBilingual: BilingualText = title && typeof title === "object"
      ? { id: String(title.id ?? ""), en: String(title.en ?? "") }
      : { id: "", en: "" };
    let descriptionBilingual: BilingualText | null = null;
    let meta: TranslationMeta | null = asMeta(translationMeta) ?? null;

    if (autoTranslate && (title?.id || title?.en || description?.id || description?.en)) {
      const titleInput = title?.id || title?.en || "";
      const descInput = description?.id || description?.en || null;
      const generated = await generateBilingual(titleInput, descInput);
      titleBilingual = generated.title;
      descriptionBilingual = generated.description;
      meta = generated.translationMeta ?? null;
    } else if (description && typeof description === "object") {
      descriptionBilingual = {
        id: String(description.id ?? ""),
        en: String(description.en ?? ""),
      };
    }

    const created = await prisma.contentEntry.create({
      data: {
        pageName: String(pageName).trim(),
        sectionName: String(sectionName).trim(),
        title: titleBilingual as Prisma.InputJsonValue,
        description:
          descriptionBilingual === null
            ? Prisma.JsonNull
            : (descriptionBilingual as Prisma.InputJsonValue),
        translationMeta:
          meta === null ? Prisma.JsonNull : (meta as Prisma.InputJsonValue),
        createdBy: session.user?.email ?? null,
      },
    });

    return NextResponse.json({
      entry: {
        id: created.id,
        pageName: created.pageName,
        sectionName: created.sectionName,
        title: asBilingual(created.title),
        description: created.description ? asBilingual(created.description) : null,
        translationMeta: asMeta(created.translationMeta),
        createdBy: created.createdBy,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
    });
  } catch (error) {
    console.error("[ADMIN_CONTENT_POST]", error);
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 }
    );
  }
}
