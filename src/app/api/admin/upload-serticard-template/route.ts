import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadSerticardTemplate } from "@/lib/qr";

/**
 * Upload Serticard template to R2
 * This endpoint should be called once to upload the template
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templateUrl = await uploadSerticardTemplate();

    if (!templateUrl) {
      return NextResponse.json(
        { error: "Failed to upload template. R2 may not be configured." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      templateUrl,
      message: "Template uploaded successfully to R2",
    });
  } catch (error) {
    console.error("Template upload failed:", error);
    return NextResponse.json(
      { error: "Failed to upload template" },
      { status: 500 }
    );
  }
}

