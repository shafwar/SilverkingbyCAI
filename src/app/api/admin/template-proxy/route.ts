import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Proxy endpoint for serticard templates
 * Fetches template from R2 and serves it with proper CORS headers
 * This prevents tainted canvas errors
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const template = searchParams.get("template"); // "front" or "back"

    if (!template || (template !== "front" && template !== "back")) {
      return NextResponse.json({ error: "Invalid template parameter" }, { status: 400 });
    }

    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
    const isLocalDev = process.env.NODE_ENV === "development" || !R2_PUBLIC_URL;

    let templateUrl: string;
    let fallbackPath: string;

    if (template === "front") {
      fallbackPath = "/images/serticard/Serticard-01.png";
      if (!isLocalDev) {
        const base = R2_PUBLIC_URL.endsWith("/") ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
        templateUrl = `${base}/templates/serticard-01.png`;
      } else {
        templateUrl = fallbackPath;
      }
    } else {
      fallbackPath = "/images/serticard/Serticard-02.png";
      if (!isLocalDev) {
        const base = R2_PUBLIC_URL.endsWith("/") ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
        templateUrl = `${base}/templates/serticard-02.png`;
      } else {
        templateUrl = fallbackPath;
      }
    }

    // Try to fetch from R2 first
    if (!isLocalDev) {
      try {
        const response = await fetch(templateUrl, {
          headers: {
            "User-Agent": "SilverKing-Server/1.0",
          },
        });

        if (response.ok) {
          const imageBuffer = await response.arrayBuffer();
          
          // Return image with CORS headers
          return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=31536000, immutable",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          });
        }
      } catch (r2Error) {
        console.warn(`[Template Proxy] Failed to fetch from R2 (${templateUrl}), falling back to local:`, r2Error);
      }
    }

    // Fallback to local file
    const fs = await import("fs/promises");
    const path = await import("path");
    const localPath = path.join(process.cwd(), "public", fallbackPath);
    
    try {
      const imageBuffer = await fs.readFile(localPath);
      
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600, must-revalidate",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } catch (localError) {
      console.error(`[Template Proxy] Failed to read local file (${localPath}):`, localError);
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("[Template Proxy] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

