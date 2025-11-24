import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { addProductInfoToQR } from "@/lib/qr";
import { getVerifyUrl } from "@/utils/constants";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { serialCode: string } }
) {
  try {
    // Decode serialCode from URL params (handle URL encoding)
    let { serialCode } = params;
    serialCode = decodeURIComponent(serialCode).trim().toUpperCase();
    
    if (!serialCode) {
      return new NextResponse("Serial code is required", { status: 400 });
    }

    // Get product information from database to ensure correct serialCode
    const product = await prisma.product.findUnique({
      where: { serialCode },
      select: {
        name: true,
        serialCode: true,
      },
    });

    // Use serialCode from database if available, otherwise use from params
    const finalSerialCode = product?.serialCode || serialCode;
    const productName = product?.name || "Product";

    // Get verify URL using centralized function
    const verifyUrl = getVerifyUrl(finalSerialCode);

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 560,
      errorCorrectionLevel: "H",
      color: { dark: "#0c0c0c", light: "#ffffff" },
      margin: 1,
    });

    // Add product information (name and serial) below QR code
    // Always use addProductInfoToQR to ensure serial number renders correctly
    const pngBuffer = await addProductInfoToQR(qrBuffer, finalSerialCode, productName);

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(pngBuffer);

    // Return as PNG image
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("QR generation failed:", error);
    return new NextResponse("Failed to generate QR code", { status: 500 });
  }
}

