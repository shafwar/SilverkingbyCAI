import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { addProductInfoToQR } from "@/lib/qr";
import { getVerifyUrl } from "@/utils/constants";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Generate single PNG image with all QR codes in a grid layout
 * Each QR code includes product name and serial code
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all products with QR records
    const products = await prisma.product.findMany({
      where: {
        qrRecord: {
          isNot: null,
        },
      },
      select: {
        id: true,
        name: true,
        serialCode: true,
        weight: true,
      },
      orderBy: {
        serialCode: "asc",
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No products with QR codes found" },
        { status: 404 }
      );
    }

    // QR code dimensions
    const qrSize = 300; // Size of each QR code
    const qrPerRow = 3; // 3 QR codes per row
    const padding = 30; // Padding around each QR
    const spacing = 20; // Space between QR codes
    const textHeight = 80; // Space for product name and serial below QR
    
    // Calculate grid dimensions
    const rows = Math.ceil(products.length / qrPerRow);
    const qrWithTextWidth = qrSize + padding * 2;
    const qrWithTextHeight = qrSize + textHeight + padding * 2;
    
    const totalWidth = qrPerRow * (qrWithTextWidth + spacing) - spacing + padding * 2;
    const totalHeight = rows * (qrWithTextHeight + spacing) - spacing + padding * 2 + 100; // Extra space for header

    // Create main canvas
    const canvas = createCanvas(totalWidth, totalHeight);
    const ctx = canvas.getContext("2d");

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Add header
    ctx.fillStyle = "#0c0c0c";
    ctx.font = "bold 32px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Silver King - All QR Codes", totalWidth / 2, 50);
    
    ctx.font = "18px Arial, sans-serif";
    ctx.fillText(`Total Products: ${products.length}`, totalWidth / 2, 85);

    // Generate and place QR codes
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const row = Math.floor(i / qrPerRow);
      const col = i % qrPerRow;

      try {
        // Get verify URL
        const verifyUrl = getVerifyUrl(product.serialCode);

        // Generate QR code as PNG buffer
        const qrBuffer = await QRCode.toBuffer(verifyUrl, {
          width: 560,
          errorCorrectionLevel: "H",
          color: { dark: "#0c0c0c", light: "#ffffff" },
          margin: 1,
        });

        // Add product information (name and serial) below QR code
        const pngBuffer = await addProductInfoToQR(
          qrBuffer,
          product.serialCode,
          product.name
        );

        // Load QR image
        const qrImage = await loadImage(pngBuffer);

        // Calculate position
        const x = padding + col * (qrWithTextWidth + spacing);
        const y = padding + 100 + row * (qrWithTextHeight + spacing); // 100 for header

        // Draw QR code
        ctx.drawImage(qrImage, x, y, qrSize, qrSize);

      } catch (error) {
        console.error(`Failed to generate QR for ${product.serialCode}:`, error);
        // Continue with next product
      }
    }

    // Convert canvas to PNG buffer
    const pngBuffer = canvas.toBuffer("image/png");

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(pngBuffer);

    // Return PNG image
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="Silver-King-All-QR-Codes-${new Date().toISOString().split("T")[0]}.png"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("PNG grid generation failed:", error);
    return new NextResponse("Failed to generate PNG grid", { status: 500 });
  }
}

