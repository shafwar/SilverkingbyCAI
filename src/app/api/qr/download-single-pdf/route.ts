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
      return NextResponse.json(
        { error: "Invalid product data" },
        { status: 400 }
      );
    }

    const productName = String(product.name).trim();
    const productSerialCode = String(product.serialCode).trim().toUpperCase();

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
      return NextResponse.json(
        { error: "Failed to load Serticard templates" },
        { status: 500 }
      );
    }

    // --- Fetch QR-only image for this serial/uniq code ---
    const baseUrl =
      process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const internalBaseUrl = baseUrl.replace(/\/$/, "");

    const qrUrl = `${internalBaseUrl}/api/qr/${encodeURIComponent(
      productSerialCode
    )}/qr-only`;
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

    const qrSize = Math.min(
      frontTemplateImage.width * 0.55,
      frontTemplateImage.height * 0.55,
      900
    );
    const qrX = (frontTemplateImage.width - qrSize) / 2;
    const qrY = frontTemplateImage.height * 0.38;

    const padding = 8;
    frontCtx.fillStyle = "#ffffff";
    frontCtx.fillRect(qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2);
    frontCtx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    const textOverwritePadding = 20;

    // Product name above QR
    const nameFontSize = Math.floor(frontTemplateImage.width * 0.027);
    const nameY = qrY - 40;
    frontCtx.font = `${nameFontSize}px Arial, sans-serif`;
    const nameTextWidth = frontCtx.measureText(productName).width;
    const placeholderNameWidth = frontCtx.measureText("0000000000000000").width;
    const nameTextHeight = nameFontSize;
    const overwriteWidth =
      Math.max(nameTextWidth, placeholderNameWidth) + textOverwritePadding * 2;

    frontCtx.fillStyle = "#ffffff";
    frontCtx.fillRect(
      frontTemplateImage.width / 2 - overwriteWidth / 2,
      nameY - nameTextHeight - textOverwritePadding,
      overwriteWidth,
      nameTextHeight + textOverwritePadding * 2
    );

    frontCtx.fillStyle = "#222222";
    frontCtx.textAlign = "center";
    frontCtx.textBaseline = "bottom";
    frontCtx.font = `${nameFontSize}px Arial, sans-serif`;
    frontCtx.fillText(productName, frontTemplateImage.width / 2, nameY);

    // Serial/uniq code below QR
    const serialFontSize = Math.floor(frontTemplateImage.width * 0.031);
    const serialY = qrY + qrSize + 40;
    frontCtx.font = `${serialFontSize}px 'Lucida Console', 'Menlo', 'Courier New', monospace`;
    const serialTextWidth = frontCtx.measureText(productSerialCode).width;
    const placeholderSerialWidth = frontCtx.measureText("00000000").width;
    const serialTextHeight = serialFontSize;
    const overwriteSerialWidth =
      Math.max(serialTextWidth, placeholderSerialWidth) + textOverwritePadding * 2;

    frontCtx.fillStyle = "#ffffff";
    frontCtx.fillRect(
      frontTemplateImage.width / 2 - overwriteSerialWidth / 2,
      serialY - textOverwritePadding,
      overwriteSerialWidth,
      serialTextHeight + textOverwritePadding * 2
    );

    frontCtx.fillStyle = "#222222";
    frontCtx.textAlign = "center";
    frontCtx.textBaseline = "top";
    frontCtx.font = `${serialFontSize}px 'Lucida Console', 'Menlo', 'Courier New', monospace`;
    frontCtx.fillText(productSerialCode, frontTemplateImage.width / 2, serialY);

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


