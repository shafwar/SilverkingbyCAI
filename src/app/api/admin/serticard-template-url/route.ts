import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fileExistsInR2 } from "@/lib/r2-client";
import { uploadSerticardTemplates } from "@/lib/qr";

/**
 * Get Serticard template URL
 * Automatically uploads templates to R2 if they don't exist
 * Returns R2 URL in production, local path in development
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
      // Production: check R2 first, auto-upload if not exists
      const base = R2_PUBLIC_URL.endsWith("/") ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
      const frontR2Key = "templates/serticard-01.png";
      const backR2Key = "templates/serticard-02.png";
      
      // Check if templates exist in R2
      const frontExists = await fileExistsInR2(frontR2Key);
      const backExists = await fileExistsInR2(backR2Key);
      
      console.log("[Template URL] R2 template check:", {
        frontExists,
        backExists,
      });
      
      // Auto-upload if templates don't exist in R2
      if (!frontExists || !backExists) {
        console.log("[Template URL] Templates not found in R2, auto-uploading...");
        const { frontUrl, backUrl } = await uploadSerticardTemplates();
        
        if (frontUrl && backUrl) {
          // Use uploaded R2 URLs
          frontTemplateUrl = frontUrl;
          backTemplateUrl = backUrl;
          console.log("[Template URL] Templates auto-uploaded to R2:", {
            front: frontTemplateUrl,
            back: backTemplateUrl,
          });
        } else {
          // Upload failed, fallback to local
          console.warn("[Template URL] Failed to upload templates to R2, falling back to local paths");
          frontTemplateUrl = "/images/serticard/Serticard-01.png";
          backTemplateUrl = "/images/serticard/Serticard-02.png";
        }
      } else {
        // Templates exist in R2, use R2 URLs
        frontTemplateUrl = `${base}/${frontR2Key}`;
        backTemplateUrl = `${base}/${backR2Key}`;
        console.log("[Template URL] Using existing R2 URLs:", {
          front: frontTemplateUrl,
          back: backTemplateUrl,
        });
      }
    }

    return NextResponse.json({
      frontTemplateUrl,
      backTemplateUrl,
    });
  } catch (error) {
    console.error("Failed to get template URL:", error);
    // Fallback to local paths on error
    return NextResponse.json({
      frontTemplateUrl: "/images/serticard/Serticard-01.png",
      backTemplateUrl: "/images/serticard/Serticard-02.png",
    });
  }
}

