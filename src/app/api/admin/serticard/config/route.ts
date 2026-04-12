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
import { deleteFromR2 } from "@/lib/r2-client";

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
    const {
      fontFamily,
      fontSizePreset,
      clearCustomTemplates,
      deleteCustomFront,
      deleteCustomBack,
      customTemplateDropdownLabel,
    } = body;
    const updates: Record<string, unknown> = {};
    const current = await getSerticardConfig();

    async function safeDeleteR2(key: string | null | undefined): Promise<void> {
      if (!key) return;
      try {
        await deleteFromR2(key);
      } catch (e) {
        console.warn("[Serticard Config] R2 delete failed (object may already be gone):", key, e);
      }
    }

    if (clearCustomTemplates === true) {
      await safeDeleteR2(current.customFrontR2Key);
      await safeDeleteR2(current.customBackR2Key);
      updates.customFrontR2Key = null;
      updates.customBackR2Key = null;
      updates.customTemplateDropdownLabel = null;
    } else {
      if (deleteCustomFront === true) {
        await safeDeleteR2(current.customFrontR2Key);
        updates.customFrontR2Key = null;
      }
      if (deleteCustomBack === true) {
        await safeDeleteR2(current.customBackR2Key);
        updates.customBackR2Key = null;
      }
    }

    if (fontFamily && typeof fontFamily === "string" && FONT_VALUES.has(fontFamily)) {
      updates.fontFamily = fontFamily;
    }
    if (fontSizePreset && ["BESAR", "KECIL"].includes(fontSizePreset)) {
      updates.fontSizePreset = fontSizePreset as FontSizePreset;
    }
    if ("customTemplateDropdownLabel" in body && clearCustomTemplates !== true) {
      if (customTemplateDropdownLabel === null || customTemplateDropdownLabel === "") {
        updates.customTemplateDropdownLabel = null;
      } else if (typeof customTemplateDropdownLabel === "string") {
        const trimmed = customTemplateDropdownLabel.trim().slice(0, 191);
        updates.customTemplateDropdownLabel = trimmed.length > 0 ? trimmed : null;
      }
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(await getSerticardConfig());
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
