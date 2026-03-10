/**
 * Admin API: get, update, delete a content entry.
 * PATCH: update (optional auto-translate or regenerate).
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateBilingual,
  regenerateTranslation,
  isTranslationAvailable,
} from "@/lib/translation";
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = Number((await params).id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const entry = await prisma.contentEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      entry: {
        id: entry.id,
        pageName: entry.pageName,
        sectionName: entry.sectionName,
        title: asBilingual(entry.title),
        description: entry.description ? asBilingual(entry.description) : null,
        translationMeta: asMeta(entry.translationMeta),
        createdBy: entry.createdBy,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    });
  } catch (error) {
    console.error("[ADMIN_CONTENT_GET_ID]", error);
    return NextResponse.json(
      { error: "Failed to load content" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = Number((await params).id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const existing = await prisma.contentEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      pageName,
      sectionName,
      title,
      description,
      translationMeta,
      autoTranslate,
      regenerateTitle,
      regenerateDescription,
    } = body || {};

    let titleBilingual = asBilingual(existing.title);
    let descriptionBilingual = existing.description
      ? asBilingual(existing.description)
      : null;
    let meta = asMeta(existing.translationMeta);

    if (title && typeof title === "object") {
      if (regenerateTitle && isTranslationAvailable()) {
        const fromLang = (regenerateTitle as "id" | "en") || "id";
        const source = fromLang === "id" ? title.id : title.en;
        const translated = await regenerateTranslation(source || "", fromLang);
        titleBilingual =
          fromLang === "id"
            ? { id: title.id || "", en: translated }
            : { id: translated, en: title.en || "" };
        meta = {
          ...meta,
          titleIdAuto: fromLang === "en",
          titleEnAuto: fromLang === "id",
        };
      } else {
        titleBilingual = {
          id: String(title.id ?? titleBilingual.id),
          en: String(title.en ?? titleBilingual.en),
        };
      }
    }

    if (description !== undefined) {
      if (description === null) {
        descriptionBilingual = null;
      } else if (typeof description === "object") {
        if (regenerateDescription && isTranslationAvailable()) {
          const fromLang = (regenerateDescription as "id" | "en") || "id";
          const source = fromLang === "id" ? description.id : description.en;
          const translated = await regenerateTranslation(source || "", fromLang);
          descriptionBilingual =
            fromLang === "id"
              ? { id: description.id || "", en: translated }
              : { id: translated, en: description.en || "" };
          meta = {
            ...meta,
            descriptionIdAuto: fromLang === "en",
            descriptionEnAuto: fromLang === "id",
          };
        } else {
          descriptionBilingual = {
            id: String(description.id ?? ""),
            en: String(description.en ?? ""),
          };
        }
      }
    }

    if (autoTranslate && (titleBilingual.id || titleBilingual.en)) {
      const generated = await generateBilingual(
        titleBilingual.id || titleBilingual.en,
        descriptionBilingual?.id || descriptionBilingual?.en || null
      );
      titleBilingual = generated.title;
      descriptionBilingual = generated.description;
      meta = generated.translationMeta ?? meta;
    }

    if (translationMeta !== undefined) {
      meta = asMeta(translationMeta);
    }

    const updated = await prisma.contentEntry.update({
      where: { id },
      data: {
        ...(pageName !== undefined && { pageName: String(pageName).trim() }),
        ...(sectionName !== undefined && { sectionName: String(sectionName).trim() }),
        title: titleBilingual as Prisma.InputJsonValue,
        description:
          descriptionBilingual === null
            ? Prisma.JsonNull
            : (descriptionBilingual as Prisma.InputJsonValue),
        translationMeta:
          meta === null ? Prisma.JsonNull : (meta as Prisma.InputJsonValue),
      },
    });

    return NextResponse.json({
      entry: {
        id: updated.id,
        pageName: updated.pageName,
        sectionName: updated.sectionName,
        title: asBilingual(updated.title),
        description: updated.description ? asBilingual(updated.description) : null,
        translationMeta: asMeta(updated.translationMeta),
        createdBy: updated.createdBy,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("[ADMIN_CONTENT_PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update content" },
      { status: 500 }
    );
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

  try {
    const id = Number((await params).id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await prisma.contentEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_CONTENT_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    );
  }
}
