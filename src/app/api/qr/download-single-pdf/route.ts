import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PDFDocument } from "pdf-lib";
import { loadSerticardTemplates, isAffirmativeCustomFlag } from "@/lib/load-serticard-templates";
import { getSerticardConfig, getFontSizeMultipliers } from "@/lib/serticard-config";
import { getCanvasPdfSansFamily, getCanvasPdfMonoFamily } from "@/lib/serticard-canvas-font";
import { drawSerticardRootKeyPill } from "@/lib/serticard-draw-rootkey";

/**
 * Generate a SINGLE Serticard PDF (front + back) for one QR code.
 *
 * This mirrors the layout and logic used in:
 * - /api/qr/download-multiple-pdf
 * - QrPreviewGrid handleDownload (page 1)
 *
 * Body:
 * {
 *   "product": { "id", "name", "serialCode", "weight", "isGram?", "rootKey?" },
 *   "templateVariant": string,
 *   "useCustomTemplate": boolean,
 *   "includeRootKey": boolean  // if false, PDF output hanya judul + serial (no root key)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const canvasMod = await import("canvas").catch(() => null);
    if (!canvasMod) {
      return NextResponse.json(
        { error: "PDF generation is unavailable in this environment (canvas native bindings missing)." },
        { status: 501 }
      );
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
    const rawVariant = body?.templateVariant != null ? String(body.templateVariant) : "01";
    const templateVariant = rawVariant === "custom" ? "01" : rawVariant;
    const rawCms = body?.cmsTemplateId;
    const cmsTemplateId =
      rawCms != null && rawCms !== ""
        ? Math.floor(Number(rawCms))
        : null;
    const useCmsTemplate =
      cmsTemplateId != null && Number.isFinite(cmsTemplateId) && cmsTemplateId > 0;

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

    // Resolve rootKey: when includeRootKey is false, output PDF hanya judul + id (no root key), like previous system
    const includeRootKey = body?.includeRootKey !== false;
    let rootKeyValue: string | null =
      product.rootKey != null && String(product.rootKey).trim() !== ""
        ? String(product.rootKey).trim()
        : null;
    if (includeRootKey && !rootKeyValue && isGram) {
      const gramItem = await prisma.gramProductItem.findFirst({
        where: {
          uniqCode: productSerialCode,
          ...(product.id != null && Number.isFinite(Number(product.id))
            ? { id: Math.floor(Number(product.id)) }
            : {}),
        },
        select: { rootKey: true },
      });
      if (gramItem?.rootKey?.trim()) rootKeyValue = gramItem.rootKey.trim();
    }

    console.log("[QR Single PDF] Processing:", {
      productName,
      productSerialCode,
      isGram,
      templateVariant,
      hasRootKey: !!rootKeyValue,
    });

    // --- Load Serticard templates (CMS spread, custom pair only if requested, else built-in variant) ---
    const useCustomRequested =
      isAffirmativeCustomFlag(body?.useCustomTemplate) || rawVariant === "custom";
    const { front: frontTemplateImage, back: backTemplateImage } = await loadSerticardTemplates(
      templateVariant,
      useCmsTemplate
        ? { cmsTemplateId: cmsTemplateId! }
        : { useCustomTemplate: useCustomRequested }
    );
    const fontConfig = await getSerticardConfig();
    const sizeMultipliers = getFontSizeMultipliers(
      fontConfig.fontSizePreset === "KECIL" ? "KECIL" : "BESAR"
    );
    const sansFamily = getCanvasPdfSansFamily(fontConfig.fontFamily);
    const monoFamily = getCanvasPdfMonoFamily();

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
    const qrImage = await canvasMod.loadImage(qrBuffer);

    // --- Compose FRONT canvas (same layout as download-multiple-pdf/handleDownload) ---
    const frontCanvas = canvasMod.createCanvas(frontTemplateImage.width, frontTemplateImage.height);
    const frontCtx = frontCanvas.getContext("2d");
    frontCtx.drawImage(frontTemplateImage, 0, 0);

    // Layout tuned for Serticard 01 (603x1053); scaled proportionally for 03-18
    const qrSize = Math.min(frontTemplateImage.width * 0.55, frontTemplateImage.height * 0.55, 900);
    const qrX = (frontTemplateImage.width - qrSize) / 2;
    const qrY = frontTemplateImage.height * 0.38;

    const padding = 8;
    frontCtx.fillStyle = "#ffffff";
    frontCtx.fillRect(qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2);
    frontCtx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    const nameOffset = Math.round(frontTemplateImage.height * 0.038);
    const serialOffset = Math.round(frontTemplateImage.height * 0.038);
    const isDarkTemplate =
      !useCmsTemplate && (useCustomRequested || templateVariant !== "01");
    const textColor = isDarkTemplate ? "#ffffff" : "#111111";

    let nameFontSize = Math.floor(frontTemplateImage.width * sizeMultipliers.nameMultiplier);
    const nameY = qrY - nameOffset;
    const displayProductName = productName && productName.length > 0 ? productName : "PRODUCT";

    frontCtx.fillStyle = textColor;
    frontCtx.textAlign = "center";
    frontCtx.textBaseline = "bottom";
    const maxNameW = frontTemplateImage.width * 0.9;
    while (nameFontSize > 10) {
      frontCtx.font = `bold ${nameFontSize}px ${sansFamily}`;
      if (frontCtx.measureText(displayProductName).width <= maxNameW) break;
      nameFontSize -= 1;
    }
    frontCtx.fillText(displayProductName, frontTemplateImage.width / 2, nameY);

    console.log("[QR Single PDF] Product name rendered:", {
      text: displayProductName,
      fontSize: nameFontSize,
      font: frontCtx.font,
    });

    const serialFontSize = Math.floor(frontTemplateImage.width * sizeMultipliers.serialMultiplier);
    const serialY = qrY + qrSize + serialOffset;
    const displaySerialCode = productSerialCode && productSerialCode.length > 0 ? productSerialCode : "UNKNOWN";

    frontCtx.fillStyle = textColor;
    frontCtx.textAlign = "center";
    frontCtx.textBaseline = "top";
    frontCtx.font = `bold ${serialFontSize}px ${monoFamily}`;
    frontCtx.fillText(displaySerialCode, frontTemplateImage.width / 2, serialY);

    const productRootKey =
      rootKeyValue != null && rootKeyValue.length > 0 ? rootKeyValue.toUpperCase() : null;

    console.log("[QR Single PDF] Serial code rendered:", {
      text: displaySerialCode,
      fontSize: serialFontSize,
      font: frontCtx.font,
      hasRootKey: !!productRootKey,
    });

    const frontBuffer = frontCanvas.toBuffer("image/png");

    // --- BACK canvas (template + root key label) ---
    const backCanvas = canvasMod.createCanvas(backTemplateImage.width, backTemplateImage.height);
    const backCtx = backCanvas.getContext("2d");
    backCtx.drawImage(backTemplateImage, 0, 0);

    if (productRootKey) {
      drawSerticardRootKeyPill(
        backCtx,
        backTemplateImage.width,
        backTemplateImage.height,
        productRootKey
      );
    }
    const backBuffer = backCanvas.toBuffer("image/png");

    // --- Build single PDF with front+back side-by-side - UNIFIED DIMENSIONS for 100% balance ---
    // Serticard 01-02 have matching dimensions; 03-18 have mismatched front/back sizes.
    // Use same panel size for both so left & right are identical (like 01-02).
    const panelWidth = Math.max(frontTemplateImage.width, backTemplateImage.width);
    const panelHeight = Math.max(frontTemplateImage.height, backTemplateImage.height);
    const gap = 0;
    const pageWidth = panelWidth * 2 + gap;
    const pageHeight = panelHeight;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    const frontPngImage = await pdfDoc.embedPng(frontBuffer);
    const backPngImage = await pdfDoc.embedPng(backBuffer);

    // Both panels drawn at SAME size = 100% balanced (same as Serticard 01-02)
    page.drawImage(frontPngImage, {
      x: 0,
      y: 0,
      width: panelWidth,
      height: panelHeight,
    });

    page.drawImage(backPngImage, {
      x: panelWidth + gap,
      y: 0,
      width: panelWidth,
      height: panelHeight,
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
