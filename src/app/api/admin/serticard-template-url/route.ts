import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Get Serticard template URL
 * Returns R2 URL in production if available, otherwise falls back to local path
 * This ensures consistency with QR codes that are already in R2
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
    const isLocalDev = process.env.NODE_ENV === "development" || !R2_PUBLIC_URL;

    let frontTemplateUrl: string;
    let backTemplateUrl: string;

    if (isLocalDev) {
      // Local development: use local path
      frontTemplateUrl = "/images/serticard/Serticard-01.png";
      backTemplateUrl = "/images/serticard/Serticard-02.png";
      
      console.log("[Template URL] Using local paths (development):", {
        front: frontTemplateUrl,
        back: backTemplateUrl,
      });
    } else {
      // Production: use R2 URL (consistent with QR codes)
      const base = R2_PUBLIC_URL.endsWith("/") ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
      frontTemplateUrl = `${base}/templates/serticard-01.png`;
      backTemplateUrl = `${base}/templates/serticard-02.png`;
      
      console.log("[Template URL] Using R2 URLs (production):", {
        front: frontTemplateUrl,
        back: backTemplateUrl,
      });
    }

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

