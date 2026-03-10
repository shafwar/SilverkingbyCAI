/**
 * Admin API: translate a single text (for Regenerate or inline translate).
 * POST body: { text: string, fromLang: "id" | "en" }
 * Returns: { translated: string }
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { translateToOtherLanguage, isTranslationAvailable } from "@/lib/translation";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { text, fromLang } = body || {};

    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }
    const lang = fromLang === "en" ? "en" : "id";

    if (!isTranslationAvailable()) {
      return NextResponse.json(
        { error: "Translation service unavailable. Set OPENAI_API_KEY." },
        { status: 503 }
      );
    }

    const translated = await translateToOtherLanguage(text.trim(), lang);
    return NextResponse.json({ translated });
  } catch (error) {
    console.error("[ADMIN_CONTENT_TRANSLATE]", error);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
