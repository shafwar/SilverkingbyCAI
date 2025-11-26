import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { addProductInfoToQR } from "@/lib/qr";
import { getVerifyUrl } from "@/utils/constants";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Generate single QR code as PDF for download
 * Includes product name and serial code
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
      console.error("[QR Download PDF] Invalid finalSerialCode from database:", {
        finalSerialCode,
        productSerialCode: product.serialCode,
        paramSerialCode: serialCode
      });
      return new NextResponse("Invalid serial code in database", { status: 400 });
    }
    
    console.log("[QR Download PDF] Using serial code from database:", {
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
    const pngBuffer = await addProductInfoToQR(qrBuffer, finalSerialCode, product.name);

    // Create buffer to store PDF
    const chunks: Buffer[] = [];
    
    // Create PDF document
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `Silver King - QR Code ${finalSerialCode}`,
        Author: "Silver King Admin",
        Subject: "Product QR Code",
      },
    });

    // Set up promise for PDF completion BEFORE adding any content
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      // Collect PDF chunks
      doc.on("data", (chunk) => chunks.push(chunk));
      
      // Handle successful completion
      doc.on("end", () => {
        try {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        } catch (error) {
          reject(error);
        }
      });
      
      // Handle errors
      doc.on("error", (error) => {
        reject(error);
      });
    });

    // Center QR code on page
    const pageWidth = 595; // A4 width in points
    const pageHeight = 842; // A4 height in points
    const margin = 50;
    const qrSize = 300; // Larger QR code for single page
    
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = (pageHeight - qrSize) / 2 - 50; // Slightly above center

    // Add QR code image to PDF
    // PDFKit needs the image as a Buffer or data URI
    try {
      doc.image(pngBuffer, qrX, qrY, {
        width: qrSize,
        height: qrSize,
        fit: [qrSize, qrSize],
      });
    } catch (imageError) {
      console.error("Error adding image to PDF:", imageError);
      // If image fails, add text placeholder
      doc.fontSize(14).text("QR Code Image", qrX, qrY + qrSize / 2, {
        align: "center",
        width: qrSize,
      });
    }

    // Add product name below QR (centered)
    doc.fontSize(16);
    doc.y = qrY + qrSize + 20;
    doc.text(product.name, {
      align: "center",
    });

    // Add serial code below name
    doc.fontSize(12).font("Courier");
    doc.y = qrY + qrSize + 45;
    doc.text(finalSerialCode, {
      align: "center",
    });

    // Finalize PDF
    doc.end();
    
    // Wait for PDF to complete
    const pdfBuffer = await pdfPromise;

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(pdfBuffer);

    // Return PDF
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="QR-${finalSerialCode}-${product.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("PDF generation failed:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return NextResponse.json(
      { 
        error: "Failed to generate PDF", 
        message: error?.message || "Unknown error",
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

