import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getVerifyUrl } from "@/utils/constants";
import { prisma } from "@/lib/prisma";

/**
 * Generate QR code ONLY (without text) for template overlay
 * This endpoint returns just the QR code image without any labels
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { serialCode: string } }
) {
  try {
    // Decode serialCode from URL params
    let { serialCode } = params;
    serialCode = decodeURIComponent(serialCode).trim().toUpperCase();
    
    if (!serialCode) {
      return new NextResponse("Serial code is required", { status: 400 });
    }

    // Get product information from database
    const product = await prisma.product.findUnique({
      where: { serialCode },
      select: {
        serialCode: true,
      },
    });

    if (!product) {
      return new NextResponse("Product not found", { status: 404 });
    }

    const finalSerialCode = product.serialCode;
    
    if (!finalSerialCode || finalSerialCode.trim().length < 3) {
      return new NextResponse("Invalid serial code", { status: 400 });
    }

    // Get verify URL
    const verifyUrl = getVerifyUrl(finalSerialCode);

    // Generate QR code ONLY (no text, no labels)
    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 800, // Larger for better print quality
      errorCorrectionLevel: "H",
      color: { dark: "#0c0c0c", light: "#ffffff" },
      margin: 2,
    });

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(qrBuffer);

    // Return as PNG image
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, must-revalidate",
        "ETag": `"${finalSerialCode}-qr-only"`,
      },
    });
  } catch (error) {
    console.error("QR-only generation failed:", error);
    return new NextResponse("Failed to generate QR code", { status: 500 });
  }
}

