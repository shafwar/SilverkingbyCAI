import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { addProductInfoToQR } from "@/lib/qr";
import { getVerifyUrl } from "@/utils/constants";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createCanvas, loadImage } from "canvas";

/**
 * Generate single PNG image with selected QR codes in a grid layout
 * Accepts array of serial codes via POST request
 * Each QR code includes product name and serial code
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { serialCodes } = body;

    if (!serialCodes || !Array.isArray(serialCodes) || serialCodes.length === 0) {
      return NextResponse.json(
        { error: "serialCodes array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Get products matching the provided serial codes
    const products = await prisma.product.findMany({
      where: {
        serialCode: {
          in: serialCodes,
        },
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
        { error: "No products with QR codes found for the provided serial codes" },
        { status: 404 }
      );
    }

    // QR code dimensions - match with addProductInfoToQR function
    const qrBaseSize = 560; // Base QR code size from QRCode.toBuffer
    const qrPerRow = 3; // 3 QR codes per row
    const innerPadding = 20; // Padding inside addProductInfoToQR (matches lib/qr.ts)
    const gridSpacing = 40; // Space between QR codes in grid (increased for better spacing)
    const titleHeight = 30; // Space for product name (from lib/qr.ts)
    const serialHeight = 25; // Space for serial code (from lib/qr.ts)
    const textSpacing = 8; // Space between title and serial (from lib/qr.ts)
    const outerPadding = 40; // Outer padding around the entire grid
    
    // Calculate dimensions for QR with text (matches addProductInfoToQR output)
    // addProductInfoToQR creates: width = qrBaseSize + innerPadding*2, height = qrBaseSize + titleHeight + serialHeight + innerPadding*2 + textSpacing
    const qrWithTextWidth = qrBaseSize + innerPadding * 2;
    const qrWithTextHeight = qrBaseSize + titleHeight + serialHeight + innerPadding * 2 + textSpacing;
    
    // Calculate grid dimensions
    const rows = Math.ceil(products.length / qrPerRow);
    // Total width = outerPadding (left) + (qrWithTextWidth + gridSpacing) * qrPerRow - gridSpacing (last one doesn't need spacing) + outerPadding (right)
    const totalWidth = outerPadding * 2 + qrPerRow * qrWithTextWidth + (qrPerRow - 1) * gridSpacing;
    // Total height = header space + outerPadding (top) + rows * qrWithTextHeight + (rows - 1) * gridSpacing + outerPadding (bottom)
    const totalHeight = 120 + outerPadding * 2 + rows * qrWithTextHeight + (rows - 1) * gridSpacing;

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
    ctx.fillText("Silver King - Selected QR Codes", totalWidth / 2, 50);
    
    ctx.font = "18px Arial, sans-serif";
    ctx.fillText(`Selected Products: ${products.length}`, totalWidth / 2, 85);

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

        // Load QR image (already contains QR + text from addProductInfoToQR)
        const qrImage = await loadImage(pngBuffer);

        // Calculate position in grid
        // x = outerPadding + col * (qrWithTextWidth + gridSpacing)
        const x = outerPadding + col * (qrWithTextWidth + gridSpacing);
        // y = header space + outerPadding + row * (qrWithTextHeight + gridSpacing)
        const y = 120 + outerPadding + row * (qrWithTextHeight + gridSpacing);

        // Draw QR code with text at exact size (qrImage already has correct dimensions from addProductInfoToQR)
        // Use actual image dimensions to ensure proper scaling
        ctx.drawImage(qrImage, x, y, qrWithTextWidth, qrWithTextHeight);

      } catch (error) {
        console.error(`Failed to generate QR for ${product.serialCode}:`, error);
        // Continue with next product
      }
    }

    // Convert canvas to PNG buffer
    const pngBuffer = canvas.toBuffer("image/png");

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(pngBuffer);

    // Generate filename with date and count
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Silver-King-Selected-QR-Codes-${products.length}-${dateStr}.png`;

    // Return PNG image
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Selected PNG grid generation failed:", error);
    return new NextResponse("Failed to generate PNG grid", { status: 500 });
  }
}

