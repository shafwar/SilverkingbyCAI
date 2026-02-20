/**
 * Public API: get content by page (and optional locale).
 * GET /api/content?page=about&locale=id
 * Returns sections with title and description for the requested locale.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type BilingualJson = { id: string; en: string };

function getLocalized(
  obj: unknown,
  locale: string
): string {
  if (!obj || typeof obj !== "object") return "";
  const o = obj as Record<string, string>;
  const key = locale === "id" ? "id" : "en";
  return typeof o[key] === "string" ? o[key] : o.en ?? o.id ?? "";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");
    const locale = (searchParams.get("locale") || "en").toLowerCase();
    const validLocale = locale === "id" ? "id" : "en";

    if (!page?.trim()) {
      return NextResponse.json(
        { error: "Missing page query parameter" },
        { status: 400 }
      );
    }

    const entries = await prisma.contentEntry.findMany({
      where: { pageName: page.trim() },
      orderBy: [{ sectionName: "asc" }],
    });

    const sections = entries.map((e) => ({
      sectionName: e.sectionName,
      title: getLocalized(e.title as BilingualJson, validLocale),
      description: e.description
        ? getLocalized(e.description as BilingualJson, validLocale)
        : null,
    }));

    return NextResponse.json({ page: page.trim(), locale: validLocale, sections });
  } catch (error) {
    console.error("[CONTENT_GET]", error);
    return NextResponse.json(
      { error: "Failed to load content" },
      { status: 500 }
    );
  }
}
