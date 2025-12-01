import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Proxy endpoint for QR codes from R2
 * Fetches QR code from R2 and serves it with proper CORS headers
 * This prevents tainted canvas errors and ensures QR codes come from R2
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const serialCode = searchParams.get("serialCode");

    if (!serialCode || serialCode.trim().length === 0) {
      return NextResponse.json({ error: "Serial code is required" }, { status: 400 });
    }

    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
    const isLocalDev = process.env.NODE_ENV === "development" || !R2_PUBLIC_URL;

    // R2 path for QR code: qr/{serialCode}.png
    const qrR2Key = `qr/${serialCode.trim().toUpperCase()}.png`;
    let qrR2Url: string;
    let fallbackUrl: string;

    if (!isLocalDev && R2_PUBLIC_URL) {
      const base = R2_PUBLIC_URL.endsWith("/") ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
      qrR2Url = `${base}/${qrR2Key}`;
      fallbackUrl = `/api/qr/${encodeURIComponent(serialCode)}/qr-only`;
    } else {
      // Local dev: use API endpoint directly
      qrR2Url = `/api/qr/${encodeURIComponent(serialCode)}/qr-only`;
      fallbackUrl = qrR2Url;
    }

    console.log(`[QR Proxy] Fetching QR for ${serialCode}:`, {
      r2Url: qrR2Url,
      fallbackUrl,
      isLocalDev,
    });

    // Try to fetch from R2 first (production only)
    if (!isLocalDev && R2_PUBLIC_URL) {
      try {
        const response = await fetch(qrR2Url, {
          headers: {
            "User-Agent": "SilverKing-Server/1.0",
          },
        });

        if (response.ok) {
          const imageBuffer = await response.arrayBuffer();
          
          console.log(`[QR Proxy] Successfully fetched QR from R2: ${qrR2Url}`);
          
          // Return image with CORS headers
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
        } else {
          console.warn(`[QR Proxy] R2 fetch failed (${response.status}), falling back to API endpoint`);
        }
      } catch (r2Error) {
        console.warn(`[QR Proxy] Failed to fetch QR from R2 (${qrR2Url}), falling back to API endpoint:`, r2Error);
      }
    }

    // Fallback to API endpoint (generates QR on-the-fly)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const internalBaseUrl = baseUrl.replace(/\/$/, "");
    const apiUrl = `${internalBaseUrl}${fallbackUrl}`;
    
    try {
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API endpoint returned ${response.status}`);
      }
      
      const imageBuffer = await response.arrayBuffer();
      
      console.log(`[QR Proxy] Successfully fetched QR from API endpoint: ${apiUrl}`);
      
      // Return image with CORS headers
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
    } catch (apiError) {
      console.error(`[QR Proxy] Failed to fetch QR from API endpoint (${apiUrl}):`, apiError);
      return NextResponse.json(
        { error: "Failed to fetch QR code" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[QR Proxy] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch QR code" },
      { status: 500 }
    );
  }
}

