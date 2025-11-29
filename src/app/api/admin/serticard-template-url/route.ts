import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Get Serticard template URL
 * For local development/testing, always use local path
 * In production, can use R2 if configured
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For local development/testing, always use local path
    // This ensures it works without R2 configuration
    // Return both front and back templates for side-by-side layout
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

