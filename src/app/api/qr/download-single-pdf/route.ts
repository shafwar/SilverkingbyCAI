import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCanvas, loadImage } from "canvas";
import { promises as fs } from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";

/**
 * Generate a SINGLE Serticard PDF (front + back) for one QR code.
 *
 * This mirrors the layout and logic used in:
 * - /api/qr/download-multiple-pdf
 * - QrPreviewGrid handleDownload (page 1)
 *
 * Body:
 * {
 *   "product": {
 *     "id": number,
 *     "name": string,
 *     "serialCode": string, // for page 2 this is uniqCode
 *     "weight": number
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch (parseError: any) {
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: parseError?.message },
        { status: 400 }
      );
    }

    const product = body?.product;
    if (
      !product ||
      typeof product.name !== "string" ||
      typeof product.serialCode !== "string" ||
      product.name.trim().length === 0 ||
      product.serialCode.trim().length === 0
    ) {
      return NextResponse.json({ error: "Invalid product data" }, { status: 400 });
    }

    const productName = String(product.name).trim();
    const productSerialCode = String(product.serialCode).trim().toUpperCase();
    const isGram = Boolean(product.isGram);

    // Validate inputs
    if (!productName || productName.length === 0) {
      console.error("[QR Single PDF] Invalid product name:", { productName });
      return NextResponse.json(
        { error: "Product name is empty or invalid" },
        { status: 400 }
      );
    }

    if (!productSerialCode || productSerialCode.length < 3) {
      console.error("[QR Single PDF] Invalid serial code:", { productSerialCode });
      return NextResponse.json(
        { error: "Serial code is empty or invalid" },
        { status: 400 }
      );
    }

    console.log("[QR Single PDF] Processing:", {
      productName,
      productSerialCode,
      isGram,
    });

    // --- Load Serticard templates (same strategy as download-multiple-pdf) ---
    const R2_PUBLIC_URL_ENV = process.env.R2_PUBLIC_URL;
    const isLocalDev = process.env.NODE_ENV === "development" || !R2_PUBLIC_URL_ENV;

    let frontTemplateImage: any;
    let backTemplateImage: any;

    if (isLocalDev) {
      const frontTemplatePath = path.join(
        process.cwd(),
        "public",
        "images",
        "serticard",
        "Serticard-01.png"
      );
      const backTemplatePath = path.join(
        process.cwd(),
        "public",
        "images",
        "serticard",
        "Serticard-02.png"
      );

      await fs.access(frontTemplatePath);
      frontTemplateImage = await loadImage(frontTemplatePath);
      await fs.access(backTemplatePath);
      backTemplateImage = await loadImage(backTemplatePath);
    } else {
      const base = R2_PUBLIC_URL_ENV!.endsWith("/")
        ? R2_PUBLIC_URL_ENV!.slice(0, -1)
        : R2_PUBLIC_URL_ENV!;
      const frontR2Url = `${base}/templates/serticard-01.png`;
      const backR2Url = `${base}/templates/serticard-02.png`;

      // Front
      try {
        const frontResponse = await fetch(frontR2Url);
        if (!frontResponse.ok) {
          throw new Error(`Front template not found in R2: ${frontResponse.status}`);
        }
        const frontBuffer = Buffer.from(await frontResponse.arrayBuffer());
        frontTemplateImage = await loadImage(frontBuffer);
      } catch (r2Error: any) {
        const frontTemplatePath = path.join(
          process.cwd(),
          "public",
          "images",
          "serticard",
          "Serticard-01.png"
        );
        await fs.access(frontTemplatePath);
        frontTemplateImage = await loadImage(frontTemplatePath);
      }

      // Back
      try {
        const backResponse = await fetch(backR2Url);
        if (!backResponse.ok) {
          throw new Error(`Back template not found in R2: ${backResponse.status}`);
        }
        const backBuffer = Buffer.from(await backResponse.arrayBuffer());
        backTemplateImage = await loadImage(backBuffer);
      } catch (r2Error: any) {
        const backTemplatePath = path.join(
          process.cwd(),
          "public",
          "images",
          "serticard",
          "Serticard-02.png"
        );
        await fs.access(backTemplatePath);
        backTemplateImage = await loadImage(backTemplatePath);
      }
    }

    if (!frontTemplateImage || !backTemplateImage) {
      return NextResponse.json({ error: "Failed to load Serticard templates" }, { status: 500 });
    }

    // --- Fetch QR-only image for this serial/uniq code ---
    const baseUrl =
      process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const internalBaseUrl = baseUrl.replace(/\/$/, "");

    const qrBase = isGram ? "/api/qr-gram" : "/api/qr";
    const qrUrl = `${internalBaseUrl}${qrBase}/${encodeURIComponent(productSerialCode)}/qr-only`;
    const qrResponse = await fetch(qrUrl);
    if (!qrResponse.ok) {
      const text = await qrResponse.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Failed to fetch QR-only image",
          details: text || `Status ${qrResponse.status}`,
        },
        { status: 500 }
      );
    }
    const qrBuffer = Buffer.from(await qrResponse.arrayBuffer());
    const qrImage = await loadImage(qrBuffer);

    // --- Compose FRONT canvas (same layout as download-multiple-pdf/handleDownload) ---
    const frontCanvas = createCanvas(frontTemplateImage.width, frontTemplateImage.height);
    const frontCtx = frontCanvas.getContext("2d");
    frontCtx.drawImage(frontTemplateImage, 0, 0);

    const qrSize = Math.min(frontTemplateImage.width * 0.55, frontTemplateImage.height * 0.55, 900);
    const qrX = (frontTemplateImage.width - qrSize) / 2;
    const qrY = frontTemplateImage.height * 0.38;

    const padding = 8;
    frontCtx.fillStyle = "#ffffff";
    frontCtx.fillRect(qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2);
    frontCtx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    const textOverwritePadding = 20;

    // Product name above QR
    const nameFontSize = Math.floor(frontTemplateImage.width * 0.042);
    const nameY = qrY - 40;
    
    // Set font with proper fallback
    const nameFont = `bold ${nameFontSize}px Arial`;
    frontCtx.font = nameFont;
    
    // Ensure text is not empty before measuring
    const displayProductName = productName && productName.length > 0 ? productName : "PRODUCT";
    const nameTextWidth = frontCtx.measureText(displayProductName).width;
    const placeholderNameWidth = frontCtx.measureText("0000000000000000").width;
    const nameTextHeight = nameFontSize;
    const overwriteWidth = Math.max(nameTextWidth, placeholderNameWidth) + textOverwritePadding * 2;

    // Draw white background for product name
    frontCtx.fillStyle = "#ffffff";
    frontCtx.fillRect(
      frontTemplateImage.width / 2 - overwriteWidth / 2,
      nameY - nameTextHeight - textOverwritePadding,
      overwriteWidth,
      nameTextHeight + textOverwritePadding * 2
    );

    // Draw product name text
    frontCtx.fillStyle = "#222222";
    frontCtx.textAlign = "center";
    frontCtx.textBaseline = "bottom";
    frontCtx.font = nameFont;
    frontCtx.fillText(displayProductName, frontTemplateImage.width / 2, nameY);

    console.log("[QR Single PDF] Product name rendered:", {
      text: displayProductName,
      fontSize: nameFontSize,
      font: nameFont,
    });

    // Serial/uniq code below QR
    const serialFontSize = Math.floor(frontTemplateImage.width * 0.048);
    const serialY = qrY + qrSize + 40;
    
    // Set monospace font for serial code
    const serialFont = `bold ${serialFontSize}px 'Courier New'`;
    frontCtx.font = serialFont;
    
    // Ensure serial code is not empty
    const displaySerialCode = productSerialCode && productSerialCode.length > 0 ? productSerialCode : "UNKNOWN";
    const serialTextWidth = frontCtx.measureText(displaySerialCode).width;
    const placeholderSerialWidth = frontCtx.measureText("00000000").width;
    const serialTextHeight = serialFontSize;
    const overwriteSerialWidth =
      Math.max(serialTextWidth, placeholderSerialWidth) + textOverwritePadding * 2;

    // Draw white background for serial code
    frontCtx.fillStyle = "#ffffff";
    frontCtx.fillRect(
      frontTemplateImage.width / 2 - overwriteSerialWidth / 2,
      serialY - textOverwritePadding,
      overwriteSerialWidth,
      serialTextHeight + textOverwritePadding * 2
    );

    // Draw serial code text
    frontCtx.fillStyle = "#222222";
    frontCtx.textAlign = "center";
    frontCtx.textBaseline = "top";
    frontCtx.font = serialFont;
    frontCtx.fillText(displaySerialCode, frontTemplateImage.width / 2, serialY);

    console.log("[QR Single PDF] Serial code rendered:", {
      text: displaySerialCode,
      fontSize: serialFontSize,
      font: serialFont,
    });

    const frontBuffer = frontCanvas.toBuffer("image/png");

    // --- BACK canvas (template only) ---
    const backCanvas = createCanvas(backTemplateImage.width, backTemplateImage.height);
    const backCtx = backCanvas.getContext("2d");
    backCtx.drawImage(backTemplateImage, 0, 0);
    const backBuffer = backCanvas.toBuffer("image/png");

    // --- Build single PDF with front+back side-by-side (same as multiple) ---
    const templateAspectRatio = frontTemplateImage.width / frontTemplateImage.height;
    const backAspectRatio = backTemplateImage.width / backTemplateImage.height;
    void templateAspectRatio;
    void backAspectRatio;

    const maxTemplateHeight = Math.max(frontTemplateImage.height, backTemplateImage.height);
    const pageHeight = maxTemplateHeight;
    const gap = 20;
    const pageWidth = frontTemplateImage.width + backTemplateImage.width + gap;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    const frontPngImage = await pdfDoc.embedPng(frontBuffer);
    const backPngImage = await pdfDoc.embedPng(backBuffer);

    page.drawImage(frontPngImage, {
      x: 0,
      y: 0,
      width: frontTemplateImage.width,
      height: frontTemplateImage.height,
    });

    page.drawImage(backPngImage, {
      x: frontTemplateImage.width + gap,
      y: 0,
      width: backTemplateImage.width,
      height: backTemplateImage.height,
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${productSerialCode}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("[QR Single PDF] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate single PDF", details: error?.message },
      { status: 500 }
    );
  }
}
