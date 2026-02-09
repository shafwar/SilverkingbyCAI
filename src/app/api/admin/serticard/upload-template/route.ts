/**
 * POST /api/admin/serticard/upload-template
 * Upload custom front and/or back template to R2
 * FormData: front (File), back (File) - at least one required
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2-client";
import { updateSerticardConfig } from "@/lib/serticard-config";

const CUSTOM_FRONT_KEY = "templates/serticard-custom-front.png";
const CUSTOM_BACK_KEY = "templates/serticard-custom-back.png";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const frontFile = formData.get("front") as File | null;
    const backFile = formData.get("back") as File | null;

    if (!frontFile && !backFile) {
      return NextResponse.json(
        { error: "At least one file (front or back) is required" },
        { status: 400 }
      );
    }

    const updates: { customFrontR2Key?: string; customBackR2Key?: string } = {};

    if (frontFile && frontFile.size > 0) {
      if (!ALLOWED_TYPES.includes(frontFile.type)) {
        return NextResponse.json(
          { error: "Front file must be PNG or JPEG" },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await frontFile.arrayBuffer());
      const contentType = frontFile.type === "image/png" ? "image/png" : "image/jpeg";
      await uploadToR2(CUSTOM_FRONT_KEY, buffer, contentType, {
        originalName: frontFile.name,
        uploadedAt: new Date().toISOString(),
      });
      updates.customFrontR2Key = CUSTOM_FRONT_KEY;
    }

    if (backFile && backFile.size > 0) {
      if (!ALLOWED_TYPES.includes(backFile.type)) {
        return NextResponse.json(
          { error: "Back file must be PNG or JPEG" },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await backFile.arrayBuffer());
      const contentType = backFile.type === "image/png" ? "image/png" : "image/jpeg";
      await uploadToR2(CUSTOM_BACK_KEY, buffer, contentType, {
        originalName: backFile.name,
        uploadedAt: new Date().toISOString(),
      });
      updates.customBackR2Key = CUSTOM_BACK_KEY;
    }

    const config = await updateSerticardConfig(updates);
    return NextResponse.json({
      success: true,
      config,
      message: "Template(s) uploaded successfully",
    });
  } catch (error) {
    console.error("[Serticard Upload] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload template" },
      { status: 500 }
    );
  }
}
