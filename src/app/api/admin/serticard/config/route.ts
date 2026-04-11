/**
 * GET /api/admin/serticard/config - Get serticard config
 * PUT /api/admin/serticard/config - Update font/layout config (not templates)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSerticardConfig,
  updateSerticardConfig,
  FONT_FAMILIES,
  FONT_SIZE_PRESETS,
  type FontSizePreset,
} from "@/lib/serticard-config";

const FONT_VALUES: Set<string> = new Set(FONT_FAMILIES.map((f) => f.value));

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const config = await getSerticardConfig();
    return NextResponse.json({
      ...config,
      fontFamilies: FONT_FAMILIES,
      fontSizePresets: FONT_SIZE_PRESETS,
    });
  } catch (error) {
    console.error("[Serticard Config] GET error:", error);
    return NextResponse.json({ error: "Failed to get config" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const { fontFamily, fontSizePreset, clearCustomTemplates, customTemplateDropdownLabel } = body;
    const updates: Record<string, unknown> = {};
    if (fontFamily && typeof fontFamily === "string" && FONT_VALUES.has(fontFamily)) {
      updates.fontFamily = fontFamily;
    }
    if (fontSizePreset && ["BESAR", "KECIL"].includes(fontSizePreset)) {
      updates.fontSizePreset = fontSizePreset as FontSizePreset;
    }
    if (clearCustomTemplates === true) {
      updates.customFrontR2Key = null;
      updates.customBackR2Key = null;
      updates.customTemplateDropdownLabel = null;
    }
    if ("customTemplateDropdownLabel" in body) {
      if (customTemplateDropdownLabel === null || customTemplateDropdownLabel === "") {
        updates.customTemplateDropdownLabel = null;
      } else if (typeof customTemplateDropdownLabel === "string") {
        const trimmed = customTemplateDropdownLabel.trim().slice(0, 191);
        updates.customTemplateDropdownLabel = trimmed.length > 0 ? trimmed : null;
      }
    }
    const config = await updateSerticardConfig(
      updates as {
        fontFamily?: string;
        fontSizePreset?: string;
        customFrontR2Key?: null;
        customBackR2Key?: null;
        customTemplateDropdownLabel?: string | null;
      }
    );
    return NextResponse.json(config);
  } catch (error) {
    console.error("[Serticard Config] PUT error:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
