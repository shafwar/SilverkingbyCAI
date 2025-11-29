import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * This endpoint is deprecated - download is now handled in frontend
 * Keeping for backward compatibility but redirects to new approach
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { serialCode: string } }
) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Return info that download should be handled in frontend
    return NextResponse.json({
      message: "Download is now handled in frontend. Use the download button in the UI.",
      serialCode: params.serialCode,
    });
  } catch (error) {
    console.error("QR download endpoint error:", error);
    return new NextResponse("Error", { status: 500 });
  }
}

