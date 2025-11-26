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

    // CRITICAL: Always use serialCode from database if product exists
    // If product doesn't exist, we can't generate a valid QR code
    if (!product) {
      console.error("[QR Route] Product not found for serialCode:", serialCode);
      return new NextResponse("Product not found", { status: 404 });
    }
    
    // Always use product.serialCode from database
    const finalSerialCode = product.serialCode;
    const productName = product.name;
    
    // Validate finalSerialCode
    if (!finalSerialCode || finalSerialCode.trim().length < 3) {
      console.error("[QR Route] Invalid finalSerialCode from database:", {
        finalSerialCode,
        productSerialCode: product.serialCode,
        paramSerialCode: serialCode
      });
      return new NextResponse("Invalid serial code in database", { status: 400 });
    }
    
    console.log("[QR Route] Using serial code from database:", {
      finalSerialCode,
      length: finalSerialCode.length,
      productName: productName
    });

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
    // CRITICAL: Use shorter cache to allow updates when serial number rendering is fixed
    // QR codes are sensitive and may need updates
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, must-revalidate",
        // Add ETag based on serial code to enable proper cache invalidation
        "ETag": `"${finalSerialCode}"`,
      },
    });
  } catch (error) {
    console.error("QR generation failed:", error);
    return new NextResponse("Failed to generate QR code", { status: 500 });
  }
}

