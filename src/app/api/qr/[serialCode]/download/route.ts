import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { addProductInfoToQR } from "@/lib/qr";
import { getVerifyUrl } from "@/utils/constants";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Generate QR code with product information for download
 * This endpoint includes product name and serial code below the QR
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

    // Decode serialCode from URL params (handle URL encoding)
    let { serialCode } = params;
    serialCode = decodeURIComponent(serialCode).trim().toUpperCase();
    
    if (!serialCode) {
      return new NextResponse("Serial code is required", { status: 400 });
    }

    // Get product information from database
    const product = await prisma.product.findUnique({
      where: { serialCode },
      select: {
        name: true,
        serialCode: true,
      },
    });

    if (!product) {
      return new NextResponse("Product not found", { status: 404 });
    }

    // Ensure we use the serialCode from database (normalized)
    // CRITICAL: Always use product.serialCode from database, never fallback to params
    const finalSerialCode = product.serialCode;
    
    // Validate finalSerialCode is not empty or invalid
    if (!finalSerialCode || finalSerialCode.trim().length < 3) {
      console.error("[QR Download] Invalid finalSerialCode from database:", {
        finalSerialCode,
        productSerialCode: product.serialCode,
        paramSerialCode: serialCode
      });
      return new NextResponse("Invalid serial code in database", { status: 400 });
    }
    
    console.log("[QR Download] Using serial code from database:", {
      finalSerialCode,
      length: finalSerialCode.length,
      productName: product.name
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
    // Use finalSerialCode from database to ensure correct serial number
    // ALWAYS generate fresh QR code (bypass R2 cache completely) for download
    console.log("[QR Download] Generating fresh QR code:", {
      serialCode: finalSerialCode,
      productName: product.name,
      serialCodeLength: finalSerialCode.length,
      serialCodeChars: finalSerialCode.split("")
    });
    
    // Validate serialCode before rendering
    if (!finalSerialCode || finalSerialCode.length < 3) {
      console.error("[QR Download] Invalid serialCode:", finalSerialCode);
      return new NextResponse("Invalid serial code", { status: 400 });
    }
    
    // Generate QR with product info - this always creates fresh image
    console.log("[QR Download] Environment check:", {
      nodeEnv: process.env.NODE_ENV,
      railwayEnv: process.env.RAILWAY_ENVIRONMENT,
      r2Available: !!process.env.R2_ENDPOINT,
      serialCode: finalSerialCode,
      productName: product.name
    });
    
    const pngBuffer = await addProductInfoToQR(qrBuffer, finalSerialCode, product.name);
    
    // Additional validation: verify buffer was created
    if (!pngBuffer || pngBuffer.length === 0) {
      console.error("[QR Download] Failed to generate PNG buffer");
      return new NextResponse("Failed to generate QR code image", { status: 500 });
    }
    
    console.log("[QR Download] QR code generated successfully:", {
      bufferSize: pngBuffer.length,
      serialCode: finalSerialCode,
      environment: process.env.NODE_ENV,
      railwayEnv: process.env.RAILWAY_ENVIRONMENT
    });

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(pngBuffer);

    // Sanitize filename: replace spaces with hyphens, remove special characters
    const sanitizedName = product.name
      .trim()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9-]/g, "") // Remove special characters except hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
    
    const filename = `QR-${finalSerialCode}${sanitizedName ? `-${sanitizedName}` : ""}.png`;
    
    // Return as PNG image with download filename
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("QR download generation failed:", error);
    return new NextResponse("Failed to generate QR code for download", { status: 500 });
  }
}

