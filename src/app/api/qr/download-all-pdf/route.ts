import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { addProductInfoToQR } from "@/lib/qr";
import { getVerifyUrl } from "@/utils/constants";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Generate PDF with all QR codes for download
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

    // Create buffer to store PDF
    const chunks: Buffer[] = [];
    
    // Create PDF document
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: "Silver King - All QR Codes",
        Author: "Silver King Admin",
        Subject: "Product QR Codes",
      },
    });

    // Collect PDF chunks
    doc.on("data", (chunk) => chunks.push(chunk));

    // Add header
    doc.fontSize(20).text("Silver King - Product QR Codes", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Total Products: ${products.length}`, { align: "center" });
    doc.moveDown(1);

    // QR code size and layout
    const qrSize = 150; // Size of QR code in PDF
    const pageWidth = 595; // A4 width in points (minus margins = 495)
    const pageHeight = 842; // A4 height in points (minus margins = 742)
    const margin = 50;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;
    const qrPerRow = 2;
    const qrSpacing = 20;
    const qrWithTextHeight = qrSize + 60; // QR + text space
    const qrWithTextWidth = (availableWidth - qrSpacing) / qrPerRow;

    let currentX = margin;
    let currentY = margin + 60; // Start below header
    let qrCount = 0;

    // Generate QR codes and add to PDF
    for (const product of products) {
      // Check if we need a new page
      if (currentY + qrWithTextHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
        currentX = margin;
      }

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

        // Calculate position for this QR code
        const col = qrCount % qrPerRow;
        const row = Math.floor(qrCount / qrPerRow);
        const x = margin + col * (qrWithTextWidth + qrSpacing);
        const y = currentY;

        // Add QR code image to PDF
        doc.image(pngBuffer, x, y, {
          width: qrSize,
          height: qrSize,
          align: "center",
        });

        // Add product name below QR (centered)
        doc.fontSize(10).text(product.name, x, y + qrSize + 5, {
          width: qrWithTextWidth,
          align: "center",
          ellipsis: true,
        });

        // Add serial code below name
        doc.fontSize(9).font("Courier").text(product.serialCode, x, y + qrSize + 20, {
          width: qrWithTextWidth,
          align: "center",
        });

        // Reset font
        doc.font("Helvetica");

        qrCount++;

        // Move to next position
        if ((qrCount % qrPerRow) === 0) {
          currentY += qrWithTextHeight + qrSpacing;
          currentX = margin;
        } else {
          currentX += qrWithTextWidth + qrSpacing;
        }
      } catch (error) {
        console.error(`Failed to generate QR for ${product.serialCode}:`, error);
        // Continue with next product
      }
    }

    // Finalize PDF and wait for completion
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on("error", reject);
      doc.end();
    });

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(pdfBuffer);

    // Return PDF
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Silver-King-All-QR-Codes-${new Date().toISOString().split("T")[0]}.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}

