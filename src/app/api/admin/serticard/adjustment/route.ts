/**
 * API routes for serticard adjustment config
 * GET: Get adjustment for a template variant
 * POST/PUT: Upsert adjustment
 * DELETE: Delete adjustment
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSerticardAdjustment,
  upsertSerticardAdjustment,
  deleteSerticardAdjustment,
  getAllSerticardAdjustments,
  type SerticardAdjustmentData,
} from "@/lib/serticard-adjustment";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateVariant = searchParams.get("templateVariant");
    const userId = searchParams.get("userId");

    if (templateVariant) {
      // Get specific adjustment
      const adjustment = await getSerticardAdjustment(
        templateVariant,
        userId ? parseInt(userId) : null
      );
      return NextResponse.json({ adjustment });
    } else {
      // Get all adjustments for user
      const adjustments = await getAllSerticardAdjustments(
        userId ? parseInt(userId) : null
      );
      return NextResponse.json({ adjustments });
    }
  } catch (error) {
    console.error("[Serticard Adjustment] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get adjustment" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const adjustmentData: SerticardAdjustmentData = {
      templateVariant: body.templateVariant,
      userId: body.userId ?? null,
      fontFamily: body.fontFamily || "Arial",
      fontSizePreset: body.fontSizePreset || "BESAR",
      productTitleSize: Math.max(0.5, Math.min(2.0, body.productTitleSize ?? 1.0)),
      uniqcodeSize: Math.max(0.5, Math.min(2.0, body.uniqcodeSize ?? 1.0)),
      serialcodeSize: Math.max(0.5, Math.min(2.0, body.serialcodeSize ?? 1.0)),
      qrSize: Math.max(0.5, Math.min(2.0, body.qrSize ?? 1.0)),
    };

    const adjustment = await upsertSerticardAdjustment(adjustmentData);
    return NextResponse.json({ success: true, adjustment });
  } catch (error) {
    console.error("[Serticard Adjustment] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save adjustment" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Same as POST
  return POST(request);
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateVariant = searchParams.get("templateVariant");
    const userId = searchParams.get("userId");

    if (!templateVariant) {
      return NextResponse.json({ error: "templateVariant is required" }, { status: 400 });
    }

    await deleteSerticardAdjustment(templateVariant, userId ? parseInt(userId) : null);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Serticard Adjustment] DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete adjustment" },
      { status: 500 }
    );
  }
}
