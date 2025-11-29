import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadSerticardTemplates } from "@/lib/qr";

/**
 * Upload Serticard templates to R2 (both front and back)
 * This endpoint should be called once to upload both templates
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { frontUrl, backUrl } = await uploadSerticardTemplates();

    if (!frontUrl || !backUrl) {
      return NextResponse.json(
        { 
          error: "Failed to upload templates. R2 may not be configured.",
          frontUrl,
          backUrl,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      frontTemplateUrl: frontUrl,
      backTemplateUrl: backUrl,
      message: "Both templates uploaded successfully to R2",
    });
  } catch (error) {
    console.error("Template upload failed:", error);
    return NextResponse.json(
      { error: "Failed to upload templates" },
      { status: 500 }
    );
  }
}

