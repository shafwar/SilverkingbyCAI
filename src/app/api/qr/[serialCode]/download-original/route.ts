import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as fs from "fs";
import * as path from "path";

/**
 * Download Original QR Code
 * Downloads QR code with title and serial number (NO template)
 *
 * Returns PNG image with:
 * - QR code image
 * - Product name (title) at top
 * - Serial code at bottom
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

    const serialCode = decodeURIComponent(params.serialCode);
    console.log("[Download Original QR] Starting for:", serialCode);

    // Get product info
    const product = await prisma.product.findUnique({
      where: { serialCode: serialCode.toUpperCase() },
    });

    if (!product) {
      console.error("[Download Original QR] Product not found:", serialCode);
      return new NextResponse("Product not found", { status: 404 });
    }

    console.log("[Download Original QR] Found product:", product.name);

    // Generate QR with title and serial using canvas
    const { createCanvas, registerFont } = await import("canvas");

    // Register fonts if available
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    try {
      if (fs.existsSync(fontsDir)) {
        const fontFiles = fs.readdirSync(fontsDir);
        fontFiles.forEach((file) => {
          if (file.endsWith(".ttf")) {
            const fontPath = path.join(fontsDir, file);
            const fontFamily = file.replace(".ttf", "");
            try {
              registerFont(fontPath, { family: fontFamily });
            } catch (err) {
              console.warn(`[Download Original QR] Failed to register font ${file}:`, err);
            }
          }
        });
      }
    } catch (err) {
      console.warn("[Download Original QR] Error registering fonts:", err);
    }

    // Fetch QR code image from endpoint
    const qrEndpoint = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/qr/${encodeURIComponent(serialCode)}/qr-only`;
    console.log("[Download Original QR] Fetching QR from:", qrEndpoint);

    const qrResponse = await fetch(qrEndpoint, {
      headers: {
        "User-Agent": "Silver-King-QR-Download",
      },
    });

    if (!qrResponse.ok) {
      throw new Error(`Failed to fetch QR code: ${qrResponse.status}`);
    }

    const qrBuffer = await qrResponse.arrayBuffer();
    const { Image } = await import("canvas");
    const qrImage = new Image();

    // Create a promise-based image loading since canvas Image doesn't have callbacks
    await new Promise<void>((resolve, reject) => {
      try {
        qrImage.onload = () => resolve();
        qrImage.onerror = () => reject(new Error("Failed to load QR image"));
        qrImage.src = Buffer.from(qrBuffer);
      } catch (err) {
        reject(err);
      }
    });

    console.log("[Download Original QR] QR image loaded successfully");

    // Calculate dimensions
    const qrSize = 400; // QR code size
    const padding = 40;
    const titleFontSize = 28;
    const serialFontSize = 18;
    const spacing = 30;

    // Canvas width = QR width + padding
    const canvasWidth = qrSize + padding * 2;
    // Canvas height = title + spacing + QR + spacing + serial + padding
    const canvasHeight = titleFontSize + spacing + qrSize + spacing + serialFontSize + padding * 2;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // White background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw title
    ctx.fillStyle = "#000000";
    ctx.font = `bold ${titleFontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Wrap text if needed
    const maxWidth = canvasWidth - padding * 2;
    const words = product.name.split(" ");
    let line = "";
    let y = padding;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + (line ? " " : "") + words[i];
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line) {
        ctx.fillText(line, canvasWidth / 2, y);
        y += titleFontSize + 5;
        line = words[i];
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, canvasWidth / 2, y);
    }

    // Draw QR code
    const qrX = (canvasWidth - qrSize) / 2;
    const qrY = padding + titleFontSize + spacing;
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    // Draw serial code
    ctx.fillStyle = "#000000";
    ctx.font = `${serialFontSize}px 'Courier New', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const serialY = qrY + qrSize + spacing;
    ctx.fillText(serialCode, canvasWidth / 2, serialY);

    console.log("[Download Original QR] Canvas created successfully");

    // Convert to PNG buffer
    const pngBuffer = canvas.toBuffer("image/png");

    // Set response headers
    const filename = `QR-Original-${serialCode}-${product.name.replace(/[^a-zA-Z0-9-]/g, "-")}.png`;

    return new NextResponse(pngBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("[Download Original QR] Error:", error);
    return new NextResponse(
      `Error generating QR: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}

