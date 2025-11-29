import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Get Serticard template URL
 * Always returns local path for now (templates are in public folder)
 * R2 support is optional - if templates are uploaded to R2, they can be accessed directly
 * But for reliability, we use local paths that always work
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Always use local paths - templates are in public folder and always accessible
    // This ensures it works in both development and production
    const frontTemplateUrl = "/images/serticard/Serticard-01.png";
    const backTemplateUrl = "/images/serticard/Serticard-02.png";

    console.log("[Template URL] Returning local template paths:", {
      front: frontTemplateUrl,
      back: backTemplateUrl,
    });

    return NextResponse.json({
      frontTemplateUrl,
      backTemplateUrl,
    });
  } catch (error) {
    console.error("Failed to get template URL:", error);
    return NextResponse.json(
      { error: "Failed to get template URL" },
      { status: 500 }
    );
  }
}

