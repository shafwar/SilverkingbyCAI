import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import JSZip from "jszip";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createCanvas, loadImage } from "canvas";
import { promises as fs } from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { createHash } from "crypto";
import { loadSerticardTemplates } from "@/lib/load-serticard-templates";
import { getSerticardConfig, getFontSizeMultipliers } from "@/lib/serticard-config";

/** Request dengan product count di atas ini diproses di background (hindari timeout 524). */
const ZIP_JOB_THRESHOLD = 25;

/** Maksimal file per satu ZIP; jika lebih maka dipecah jadi beberapa ZIP (batch 1, 2, ...) agar cepat & aman dari timeout. */
const ZIP_CHUNK_SIZE = 100;

function buildZipCacheKey(args: {
  batchId?: number | null;
  validProducts: Array<{ serialCode: string; isGram?: boolean }>;
  templateVariant: string;
  useCustom: boolean;
}): string {
  const { batchId, validProducts, templateVariant, useCustom } = args;
  const gram = validProducts.some((p) => p.isGram === true) ? 1 : 0;
  if (batchId != null) {
    return `gram-batch:${batchId}:tpl:${templateVariant}:custom:${useCustom ? 1 : 0}:gram:${gram}`;
  }
  const serials = validProducts
    .map((p) => String(p.serialCode || "").trim().toUpperCase())
    .filter(Boolean)
    .sort();
  const base = serials.join(",");
  const hash = createHash("sha256").update(base).digest("hex").slice(0, 32);
  return `serials:${hash}:n:${serials.length}:tpl:${templateVariant}:custom:${useCustom ? 1 : 0}:gram:${gram}`;
}

/**
 * Generate ZIP file with multiple PDFs (one PDF per QR code)
 * Organizes PDFs into subfolders based on weight (gramasi) if different weights exist
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[QR Multiple] Starting download-multiple-pdf request");

    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      console.error("[QR Multiple] Unauthorized access attempt");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error("[QR Multiple] Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: parseError?.message },
        { status: 400 }
      );
    }

    // CRITICAL: Accept products (full objects) from frontend, same as handleDownload (single)
    const {
      products: productsFromFrontend,
      serialCodes,
      batchNumber,
      batchId: bodyBatchId,
      productTitle: bodyProductTitle,
      templateVariant: templateVariantParam,
      useCustomTemplate,
    } = body;
    const templateVariant = templateVariantParam ?? "01";
    const useCustom = useCustomTemplate === true;
    const isGramRequest =
      body?.isGram === true ||
      (Array.isArray(productsFromFrontend) && productsFromFrontend.some((p: any) => p?.isGram));

    // Support both formats: products (new, preferred) or serialCodes (legacy, fallback)
    let productsData: Array<{
      id: number;
      name: string;
      serialCode: string;
      weight: number;
      isGram?: boolean;
      rootKey?: string | null;
    }>;

    if (
      productsFromFrontend &&
      Array.isArray(productsFromFrontend) &&
      productsFromFrontend.length > 0
    ) {
      // NEW APPROACH: Use products directly from frontend (same as handleDownload single)
      console.log(
        `[QR Multiple] Received ${productsFromFrontend.length} product objects from frontend (NEW APPROACH - same as handleDownload single)`
      );
      console.log(`[QR Multiple] Sample products from frontend:`, productsFromFrontend.slice(0, 3));

      // CRITICAL: Use products directly from frontend, no database query needed
      // This is the SAME approach as handleDownload (single) that works correctly
      productsData = productsFromFrontend.map((p: any) => ({
        id: p.id,
        name: p.name,
        serialCode: p.serialCode,
        weight: p.weight,
        isGram: p.isGram === true,
        rootKey: p.rootKey != null ? String(p.rootKey).trim() || null : null,
      }));

      console.log(`[QR Multiple] Using products from frontend (no database query):`, {
        count: productsData.length,
        sample: productsData.slice(0, 3),
      });
    } else if (serialCodes && Array.isArray(serialCodes) && serialCodes.length > 0) {
      // LEGACY APPROACH: Query database using serialCodes (fallback for backward compatibility)
      console.log(
        `[QR Multiple] Received ${serialCodes.length} serial codes (LEGACY APPROACH - querying database)`
      );
      const normalizedSerialCodes = serialCodes.map((sc: string) =>
        String(sc).trim().toUpperCase()
      );
      console.log(`[QR Multiple] ====== DATABASE QUERY START (LEGACY) ======`);
      console.log(`[QR Multiple] Normalized serialCodes:`, {
        original: serialCodes.slice(0, 5),
        normalized: normalizedSerialCodes.slice(0, 5),
        total: normalizedSerialCodes.length,
      });

      if (isGramRequest) {
        const gramItems = await prisma.gramProductItem.findMany({
          where: {
            uniqCode: {
              in: normalizedSerialCodes,
            },
          },
          include: {
            batch: true,
          },
          orderBy: {
            uniqCode: "asc",
          },
        });

        productsData = gramItems.map((p) => ({
          id: p.id,
          name: p.batch?.name || p.uniqCode,
          serialCode: p.uniqCode,
          weight: p.batch?.weight || 0,
          isGram: true,
          rootKey: p.rootKey != null ? String(p.rootKey).trim() || null : null,
        }));
      } else {
        const products = await prisma.product.findMany({
          where: {
            serialCode: {
              in: normalizedSerialCodes,
            },
            qrRecord: {
              isNot: null,
            },
          },
          include: {
            qrRecord: true,
          },
          orderBy: {
            serialCode: "asc",
          },
        });

        productsData = products.map((p) => ({
          id: p.id,
          name: p.name,
          serialCode: p.serialCode,
          weight: p.weight,
          isGram: false,
        }));
      }

      console.log(`[QR Multiple] ====== DATABASE QUERY END (LEGACY) ======`);
    } else {
      console.error("[QR Multiple] Invalid request:", {
        hasProducts: !!productsFromFrontend,
        hasSerialCodes: !!serialCodes,
        productsType: typeof productsFromFrontend,
        serialCodesType: typeof serialCodes,
      });
      return NextResponse.json(
        {
          error: "Either 'products' array or 'serialCodes' array is required and must not be empty",
        },
        { status: 400 }
      );
    }

    // CRITICAL: Log products data to verify it's correct
    console.log(`[QR Multiple] ====== PRODUCTS DATA VERIFICATION ======`);
    console.log(
      `[QR Multiple] Products data (from frontend or database):`,
      JSON.stringify(productsData.slice(0, 3), null, 2)
    );
    productsData.slice(0, 3).forEach((p, idx) => {
      console.log(`[QR Multiple] Product ${idx + 1}:`, {
        id: p.id,
        name: p.name,
        serialCode: p.serialCode,
        nameType: typeof p.name,
        serialCodeType: typeof p.serialCode,
        nameIsNull: p.name === null,
        nameIsUndefined: p.name === undefined,
        serialCodeIsNull: p.serialCode === null,
        serialCodeIsUndefined: p.serialCode === undefined,
        nameValue: JSON.stringify(p.name),
        serialCodeValue: JSON.stringify(p.serialCode),
      });
    });

    console.log(`[QR Multiple] ====== PRODUCTS DATA SUMMARY ======`);
    console.log(`[QR Multiple] Products data summary:`, {
      totalCount: productsData.length,
      sampleProducts: productsData.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        serialCode: p.serialCode,
        nameLength: p.name?.length || 0,
        serialCodeLength: p.serialCode?.length || 0,
        nameIsValid: !!(p.name && p.name.trim().length > 0),
        serialCodeIsValid: !!(p.serialCode && p.serialCode.trim().length > 0),
      })),
    });

    if (productsData.length === 0) {
      console.error(`[QR Multiple] ERROR: No products data available`);
      return NextResponse.json({ error: "No products data provided or found" }, { status: 404 });
    }

    // CRITICAL: Filter out products with missing data BEFORE processing
    // These products will be skipped to prevent "0000" or empty text
    // Use productsData (from frontend or database)
    const validProducts = productsData.filter(
      (p) =>
        p.name &&
        p.serialCode &&
        p.name.trim().length > 0 &&
        p.serialCode.trim().length > 0 &&
        p.serialCode.trim().toUpperCase() !== "0000" &&
        p.name.trim().toUpperCase() !== "0000"
    );

    const invalidProducts = productsData.filter(
      (p) =>
        !p.name ||
        !p.serialCode ||
        p.name.trim().length === 0 ||
        p.serialCode.trim().length === 0 ||
        p.serialCode.trim().toUpperCase() === "0000" ||
        p.name.trim().toUpperCase() === "0000"
    );

    if (invalidProducts.length > 0) {
      console.error(
        `[QR Multiple] WARNING: Found ${invalidProducts.length} products with invalid/missing data (will be skipped):`,
        invalidProducts.map((p) => ({
          id: p.id,
          name: p.name || "NULL",
          serialCode: p.serialCode || "NULL",
        }))
      );
    }

    if (validProducts.length === 0) {
      console.error(`[QR Multiple] ERROR: No valid products found after filtering`);
      return NextResponse.json(
        { error: "No valid products found (all products have missing or invalid data)" },
        { status: 400 }
      );
    }

    console.log(
      `[QR Multiple] Valid products count: ${validProducts.length}/${productsData.length}`
    );
    console.log(`[QR Multiple] ====== DATABASE QUERY END ======`);

    // Cache key: gunakan hasil ZIP yang sudah tersimpan di R2 bila request sama
    const cacheKey = buildZipCacheKey({
      batchId: bodyBatchId ?? null,
      validProducts,
      templateVariant,
      useCustom,
    });
    const cached = await prisma.qrZipDownloadCache.findUnique({ where: { cacheKey } });
    if (cached) {
      await prisma.qrZipDownloadCache.update({
        where: { cacheKey },
        data: { hitCount: { increment: 1 }, lastAccessedAt: new Date() },
      });
      return NextResponse.json({
        ...(cached.result as any),
        cached: true,
        cacheKey,
      });
    }

    // Request besar: proses di background agar tidak kena timeout 524 (Cloudflare/origin)
    if (
      validProducts.length > ZIP_JOB_THRESHOLD &&
      productsFromFrontend &&
      Array.isArray(productsFromFrontend) &&
      productsFromFrontend.length > 0
    ) {
      // Kalau sudah ada job untuk request yang sama, jangan render ulang.
      const existingJob = await prisma.qrZipDownloadJob.findFirst({
        where: { cacheKey, status: { in: ["PENDING", "PROCESSING"] } },
        orderBy: { createdAt: "desc" },
      });
      if (existingJob) {
        return NextResponse.json({
          jobId: existingJob.id,
          status: "pending",
          cacheKey,
          message: "Job ZIP sudah berjalan. Silakan tunggu / polling status.",
        });
      }

      const requestPayload = {
        products: productsFromFrontend,
        batchId: bodyBatchId,
        productTitle: bodyProductTitle,
        templateVariant,
        useCustomTemplate: useCustom,
        batchNumber: batchNumber ?? bodyBatchId ?? Math.floor(Date.now() / 1000),
        cacheKey,
      };
      const job = await prisma.qrZipDownloadJob.create({
        data: {
          status: "PENDING",
          cacheKey,
          requestPayload: requestPayload as any,
        },
      });
      processZipJobInBackground(job.id).catch((err) => {
        console.error("[QR Multiple] Background job failed:", err);
      });
      return NextResponse.json({
        jobId: job.id,
        status: "pending",
        cacheKey,
        message:
          "ZIP sedang diproses di background (banyak file). Silakan polling status atau tunggu notifikasi.",
      });
    }

    // Jalankan generate ZIP + upload R2 (sync path)
    const zipOpts = {
      bodyProductTitle,
      templateVariant,
      useCustom,
      batchNumber: batchNumber ?? bodyBatchId ?? Math.floor(Date.now() / 1000),
      isGramRequest,
    };
    const outcome = await executeZipGeneration(validProducts, zipOpts);
    if (outcome.json) {
      await prisma.qrZipDownloadCache.upsert({
        where: { cacheKey },
        update: { result: outcome.json as any, lastAccessedAt: new Date(), hitCount: { increment: 1 } },
        create: { cacheKey, result: outcome.json as any, lastAccessedAt: new Date(), hitCount: 1 },
      });
      return NextResponse.json(outcome.json);
    }
    return new NextResponse(new Uint8Array(outcome.zip.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${outcome.zip.filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || "";
    const errorName = error?.name || "UnknownError";

    console.error("[QR Multiple] Fatal error in download-multiple-pdf:", {
      name: errorName,
      message: errorMessage,
      stack: errorStack,
    });

    return NextResponse.json(
      {
        error: "Failed to generate ZIP file",
        message: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

// --- Shared ZIP generation (sync + background job) ---
type ZipGenProduct = {
  id: number;
  name: string;
  serialCode: string;
  weight: number;
  isGram?: boolean;
  rootKey?: string | null;
};
type ZipGenOpts = {
  bodyProductTitle?: string;
  templateVariant: string;
  useCustom: boolean;
  batchNumber: number;
  isGramRequest: boolean;
  /** When set, progress (Item 1-100: X%, ...) is written to this job for polling. */
  jobId?: number;
};
type ZipOutcome = {
  json?: Record<string, unknown>;
  zip: { buffer: Buffer; filename: string };
};

type ZipChunkContext = {
  frontTemplateImage: Awaited<ReturnType<typeof loadImage>>;
  backTemplateImage: Awaited<ReturnType<typeof loadImage>>;
  fontConfig: Awaited<ReturnType<typeof getSerticardConfig>>;
  sizeMultipliers: ReturnType<typeof getFontSizeMultipliers>;
  internalBaseUrl: string;
  bodyProductTitle?: string;
  batchNumber: number;
  isGramRequest: boolean;
  hasMultipleWeights: boolean;
  templateVariant: string;
  useCustom: boolean;
};

/** Callback untuk progress dalam satu chunk: (processed, total) => void. Dipanggil setiap beberapa item. */
type OnChunkProgress = (processed: number, total: number) => void | Promise<void>;

async function updateJobProgress(
  jobId: number,
  progressPercent: number,
  progressMessage: string
): Promise<void> {
  try {
    await prisma.qrZipDownloadJob.update({
      where: { id: jobId },
      data: {
        progressPercent: Math.min(100, Math.max(0, progressPercent)),
        progressMessage: progressMessage.slice(0, 500),
        updatedAt: new Date(),
      },
    });
  } catch (e) {
    console.warn("[QR Multiple] updateJobProgress failed:", (e as Error)?.message);
  }
}

/** Simpan partial result ke job (setiap chunk selesai) agar frontend bisa dapat URL dan auto-download. */
async function updateJobPartialResult(
  jobId: number,
  partial: { success: boolean; downloads: Array<{ batchIndex: number; totalBatches: number; download_url: string; fileCount: number; product_title: string; product_id: string; rootkey: string | null }>; total_files: number; chunked: boolean }
): Promise<void> {
  try {
    await prisma.qrZipDownloadJob.update({
      where: { id: jobId },
      data: { result: partial as any, updatedAt: new Date() },
    });
  } catch (e) {
    console.warn("[QR Multiple] updateJobPartialResult failed:", (e as Error)?.message);
  }
}

/** Build satu ZIP dari satu slice products; dipakai untuk single ZIP atau per chunk. */
async function buildOneZipChunk(
  validProducts: ZipGenProduct[],
  ctx: ZipChunkContext,
  onProgress?: OnChunkProgress
): Promise<{ zip: JSZip; successCount: number; failCount: number; firstProduct: ZipGenProduct | null }> {
  const {
    frontTemplateImage,
    backTemplateImage,
    fontConfig,
    sizeMultipliers,
    internalBaseUrl,
    bodyProductTitle,
    batchNumber,
    isGramRequest,
    hasMultipleWeights,
    templateVariant,
  } = ctx;
  const zip = new JSZip();
  let successCount = 0;
  let failCount = 0;
  let firstProduct: ZipGenProduct | null = null;
  const totalToProcess = validProducts.length;
  const logEvery = totalToProcess > 50 ? Math.max(1, Math.floor(totalToProcess / 10)) : 1;

  for (let idx = 0; idx < validProducts.length; idx++) {
    const product = validProducts[idx];
    const shouldLog = idx === 0 || idx === totalToProcess - 1 || (idx + 1) % logEvery === 0;
    try {
      const productName = product.name ? String(product.name).trim() : "";
      const productSerialCode = product.serialCode
        ? String(product.serialCode).trim().toUpperCase()
        : "";
      if (!productName || productName === "0000" || !productSerialCode || productSerialCode === "0000") {
        failCount++;
        continue;
      }
      const productIsGram = (product as any).isGram === true || isGramRequest;
      const qrBase = productIsGram ? "/api/qr-gram" : "/api/qr";
      const qrUrl = `${internalBaseUrl}${qrBase}/${encodeURIComponent(productSerialCode)}/qr-only`;
      const qrResponse = await fetch(qrUrl);
      if (!qrResponse.ok) {
        failCount++;
        continue;
      }
      const qrBuffer = Buffer.from(await qrResponse.arrayBuffer());
      const qrImage = await loadImage(qrBuffer);
      const frontCanvas = createCanvas(frontTemplateImage.width, frontTemplateImage.height);
      const frontCtx = frontCanvas.getContext("2d");
      frontCtx!.drawImage(frontTemplateImage, 0, 0);
      const qrSize = Math.min(
        frontTemplateImage.width * 0.55,
        frontTemplateImage.height * 0.55,
        900
      );
      const qrX = (frontTemplateImage.width - qrSize) / 2;
      const qrY = frontTemplateImage.height * 0.38;
      const padding = 8;
      frontCtx!.fillStyle = "#ffffff";
      frontCtx!.fillRect(qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2);
      frontCtx!.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
      const nameOffset = Math.round(frontTemplateImage.height * 0.038);
      const serialOffset = Math.round(frontTemplateImage.height * 0.038);
      const isDarkTemplate = templateVariant !== "01";
      const textColor = isDarkTemplate ? "#ffffff" : "#111111";
      const nameFontSize = Math.floor(frontTemplateImage.width * sizeMultipliers.nameMultiplier);
      const nameY = qrY - nameOffset;
      frontCtx!.fillStyle = textColor;
      frontCtx!.textAlign = "center";
      frontCtx!.textBaseline = "bottom";
      frontCtx!.font = `bold ${nameFontSize}px ${fontConfig.fontFamily}, sans-serif`;
      frontCtx!.fillText(productName, frontTemplateImage.width / 2, nameY);
      const serialFontSize = Math.floor(frontTemplateImage.width * sizeMultipliers.serialMultiplier);
      const serialY = qrY + qrSize + serialOffset;
      frontCtx!.fillStyle = textColor;
      frontCtx!.textAlign = "center";
      frontCtx!.textBaseline = "top";
      frontCtx!.font = `bold ${serialFontSize}px ${fontConfig.fontFamily}, monospace`;
      frontCtx!.fillText(productSerialCode, frontTemplateImage.width / 2, serialY);
      const productRootKey =
        (product as any).rootKey != null && String((product as any).rootKey).trim() !== ""
          ? String((product as any).rootKey).trim().toUpperCase()
          : null;
      if (productRootKey) {
        const rootKeyFontSize = Math.max(10, Math.floor(serialFontSize * 0.65));
        const rootKeyGap = 8;
        const rootKeyY = serialY + serialFontSize + rootKeyGap;
        frontCtx!.font = `${rootKeyFontSize}px ${fontConfig.fontFamily}, monospace`;
        frontCtx!.fillStyle = textColor;
        frontCtx!.textAlign = "center";
        frontCtx!.textBaseline = "top";
        frontCtx!.fillText(productRootKey, frontTemplateImage.width / 2, rootKeyY);
      }
      const frontBuffer = frontCanvas.toBuffer("image/png");
      const backCanvas = createCanvas(backTemplateImage.width, backTemplateImage.height);
      const backCtx = backCanvas.getContext("2d");
      backCtx!.drawImage(backTemplateImage, 0, 0);
      const backBuffer = backCanvas.toBuffer("image/png");
      const panelWidth = Math.max(frontTemplateImage.width, backTemplateImage.width);
      const panelHeight = Math.max(frontTemplateImage.height, backTemplateImage.height);
      const gap = 0;
      const pageWidth = panelWidth * 2 + gap;
      const pageHeight = panelHeight;
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const frontPngImage = await pdfDoc.embedPng(frontBuffer);
      const backPngImage = await pdfDoc.embedPng(backBuffer);
      page.drawImage(frontPngImage, { x: 0, y: 0, width: panelWidth, height: panelHeight });
      page.drawImage(backPngImage, {
        x: panelWidth + gap,
        y: 0,
        width: panelWidth,
        height: panelHeight,
      });
      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);
      const sanitizedName = (product.name ?? "")
        .toString()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const rootKeyPart = (product as any).rootKey
        ? String((product as any).rootKey).trim().replace(/[^a-zA-Z0-9-]/g, "") || ""
        : "";
      const uniqueId = rootKeyPart ? `-${rootKeyPart}` : `-id${product.id}`;
      const filename = `QR-${product.serialCode}${uniqueId}${sanitizedName ? `-${sanitizedName}` : ""}.pdf`;
      let folderPath = "";
      if (hasMultipleWeights) folderPath = `${product.weight}gr/`;
      zip.file(`${folderPath}${filename}`, pdfBuffer);
      successCount++;
      if (successCount === 1) firstProduct = product;
      if (shouldLog) {
        console.log(`[QR Multiple] Chunk progress ${idx + 1}/${totalToProcess} added (${successCount} ok)`);
      }
      const processed = idx + 1;
      if (onProgress && (processed % 5 === 0 || processed === totalToProcess)) {
        await (onProgress(processed, totalToProcess) as Promise<void>);
      }
    } catch (err: any) {
      failCount++;
      if (shouldLog) console.error(`[QR Multiple] Chunk item ${idx + 1} failed:`, err?.message);
      const processed = idx + 1;
      if (onProgress && (processed % 5 === 0 || processed === totalToProcess)) {
        await (onProgress(processed, totalToProcess) as Promise<void>);
      }
    }
  }
  return { zip, successCount, failCount, firstProduct };
}

async function executeZipGeneration(
  validProducts: ZipGenProduct[],
  opts: ZipGenOpts
): Promise<ZipOutcome> {
  const { bodyProductTitle, templateVariant, useCustom, batchNumber, isGramRequest } = opts;

  // Group VALID products by weight (gramasi)
  const productsByWeight = new Map<number, ZipGenProduct[]>();
  validProducts.forEach((product) => {
    const weight = product.weight;
    if (!productsByWeight.has(weight)) {
      productsByWeight.set(weight, []);
    }
    productsByWeight.get(weight)!.push(product);
  });

  const hasMultipleWeights = productsByWeight.size > 1;

  // NEW APPROACH: Use same logic as frontend - no PDFKit, no fontconfig errors
  // 1. Get QR from /api/qr/[serialCode]/qr-only (no PDFKit)
  // 2. Get template from file system or R2
  // 3. Combine in canvas (same as frontend)
  // 4. Generate PDF using pdf-lib (no fontconfig errors)
  console.log(`[QR Multiple] ====== USING FRONTEND APPROACH ======`);
  console.log(`[QR Multiple] Will combine QR + template in canvas, then generate PDF with pdf-lib`);
  console.log(`[QR Multiple] Template variant: ${templateVariant}`);

  // Pre-load BOTH templates (front and back) - custom or variant
  // If useCustom flag is set, loadSerticardTemplates will automatically use custom templates
  const { front: frontTemplateImage, back: backTemplateImage } = await loadSerticardTemplates(
    useCustom ? undefined : templateVariant
  );
  const fontConfig = await getSerticardConfig();
  const sizeMultipliers = getFontSizeMultipliers(
    fontConfig.fontSizePreset === "KECIL" ? "KECIL" : "BESAR"
  );

  console.log(`[QR Multiple] Both templates loaded successfully:`, {
    front: `${frontTemplateImage.width}x${frontTemplateImage.height}`,
    back: `${backTemplateImage.width}x${backTemplateImage.height}`,
  });

  // Get base URL for internal API calls
  const baseUrl =
    process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const internalBaseUrl = baseUrl.replace(/\/$/, "");

  const ctx: ZipChunkContext = {
    frontTemplateImage,
    backTemplateImage,
    fontConfig,
    sizeMultipliers,
    internalBaseUrl,
    bodyProductTitle,
    batchNumber,
    isGramRequest,
    hasMultipleWeights,
    templateVariant,
    useCustom,
  };

  const jobId = opts.jobId;
  if (jobId) await updateJobProgress(jobId, 5, "Menyiapkan template dan data...");

  if (validProducts.length > ZIP_CHUNK_SIZE) {
    console.log(`[QR Multiple] Chunked mode: ${validProducts.length} files → ${Math.ceil(validProducts.length / ZIP_CHUNK_SIZE)} ZIPs of max ${ZIP_CHUNK_SIZE}`);
    const chunks: ZipGenProduct[][] = [];
    for (let i = 0; i < validProducts.length; i += ZIP_CHUNK_SIZE)
      chunks.push(validProducts.slice(i, i + ZIP_CHUNK_SIZE));
    const dateStr = new Date().toISOString().split("T")[0];
    const batchNum = batchNumber || Math.floor(Date.now() / 1000);
    const R2_ENDPOINT = process.env.R2_ENDPOINT;
    const R2_BUCKET = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME;
    const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
    let normalizedR2Endpoint: string | null = null;
    if (R2_ENDPOINT) normalizedR2Endpoint = R2_ENDPOINT.replace(/\/[^/]+$/, "").replace(/\/$/, "");
    else if (R2_ACCOUNT_ID) normalizedR2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const r2Available =
      !!normalizedR2Endpoint &&
      !!R2_BUCKET &&
      !!R2_ACCESS_KEY_ID &&
      !!R2_SECRET_ACCESS_KEY &&
      !!R2_PUBLIC_URL;
    if (!r2Available || !normalizedR2Endpoint)
      throw new Error("R2 required for chunked ZIP. Set env vars.");
    const r2Client = new S3Client({
      region: "auto",
      endpoint: normalizedR2Endpoint,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY! },
      forcePathStyle: true,
      maxAttempts: 3,
    });
    const downloads: Array<{
      batchIndex: number;
      totalBatches: number;
      download_url: string;
      fileCount: number;
      product_title: string;
      product_id: string;
      rootkey: string | null;
    }> = [];
    const totalChunks = chunks.length;
    for (let c = 0; c < totalChunks; c++) {
      const startItem = c * ZIP_CHUNK_SIZE + 1;
      const endItem = Math.min((c + 1) * ZIP_CHUNK_SIZE, validProducts.length);
      const batchLabel = `(batch ${c + 1} dari ${totalChunks})`;
      if (jobId) {
        await updateJobProgress(
          jobId,
          Math.floor((c / totalChunks) * 100),
          `Item ${startItem}-${endItem}: 0% ${batchLabel}`
        );
      }
      const chunkResult = await buildOneZipChunk(chunks[c], ctx, jobId
        ? async (processed, total) => {
            const pct = Math.round((processed / total) * 100);
            const overall = Math.floor((c / totalChunks) * 100 + (processed / total) * (100 / totalChunks));
            await updateJobProgress(
              jobId,
              Math.min(99, overall),
              `Item ${startItem}-${endItem}: ${pct}% ${batchLabel}`
            );
          }
        : undefined);
      if (chunkResult.successCount === 0) continue;
      if (jobId) {
        await updateJobProgress(
          jobId,
          Math.floor(((c + 1) / totalChunks) * 100) - (c + 1 === totalChunks ? 0 : 1),
          `Item ${startItem}-${endItem} selesai. Mengunggah... ${batchLabel}`
        );
      }
      const zipBuffer = await chunkResult.zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 9 },
      });
      // Satu folder induk (batch-{num}-{date}), tiap batch 100 = subfolder sendiri; bisa selesai bertahap
      const batchFolder = `batch-${c + 1}-of-${totalChunks}`;
      const r2Key = `qr-batches/batch-${batchNum}-${dateStr}/${batchFolder}/${batchFolder}.zip`;
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET!,
          Key: r2Key,
          Body: zipBuffer,
          ContentType: "application/zip",
          CacheControl: "public, max-age=86400",
        })
      );
      const base = R2_PUBLIC_URL!.endsWith("/") ? R2_PUBLIC_URL!.slice(0, -1) : R2_PUBLIC_URL!;
      const firstProduct = chunkResult.firstProduct;
      downloads.push({
        batchIndex: c + 1,
        totalBatches: chunks.length,
        download_url: `${base}/${r2Key}`,
        fileCount: chunkResult.successCount,
        product_title: bodyProductTitle ?? firstProduct?.name ?? "Serticard ZIP",
        product_id: String(firstProduct?.serialCode ?? batchNum),
        rootkey: firstProduct?.rootKey != null ? String(firstProduct.rootKey).trim() : null,
      });
      // Partial result agar frontend bisa auto-download tiap batch begitu selesai (tanpa nunggu semua)
      if (jobId) {
        await updateJobPartialResult(jobId, {
          success: true,
          downloads: [...downloads],
          total_files: validProducts.length,
          chunked: true,
        });
      }
    }
    if (jobId) await updateJobProgress(jobId, 100, "Semua batch selesai.");
    console.log(`[QR Multiple] Chunked upload done: ${downloads.length} ZIPs, ${validProducts.length} total files`);
    return {
      json: { success: true, downloads, total_files: validProducts.length, chunked: true },
      zip: { buffer: Buffer.alloc(0), filename: "chunked.zip" },
    };
  }

  const n = validProducts.length;
  if (jobId) await updateJobProgress(jobId, 10, `Item 1-${n}: 0%`);
  const chunkResult = await buildOneZipChunk(validProducts, ctx, jobId
    ? async (processed, total) => {
        const pct = Math.round((processed / total) * 100);
        const overall = 10 + Math.round((processed / total) * 80);
        await updateJobProgress(jobId!, Math.min(89, overall), `Item 1-${n}: ${pct}%`);
      }
    : undefined);
  if (chunkResult.successCount === 0) {
    const errorDetails = {
      message: "Failed to generate any PDFs. All products failed.",
      totalProducts: validProducts.length,
      failedCount: chunkResult.failCount,
    };
    console.error("[QR Multiple] All PDFs failed:", errorDetails);
    throw new Error(errorDetails.message);
  }
  const zipBuffer = await chunkResult.zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `Silver-King-QR-Codes-${validProducts.length}-${dateStr}.zip`;

  // Single ZIP: R2 upload below (reuses zipBuffer, dateStr, filename from chunkResult)
  const successCount = chunkResult.successCount;
  const firstProduct = chunkResult.firstProduct;
  // Upload ZIP to R2 if available
  const R2_ENDPOINT = process.env.R2_ENDPOINT;
  const R2_BUCKET = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;

  // Normalize R2 endpoint - remove bucket name if present, ensure proper format
  let normalizedR2Endpoint: string | null = null;
  if (R2_ENDPOINT) {
    // Remove bucket name and any trailing paths
    normalizedR2Endpoint = R2_ENDPOINT.replace(/\/[^\/]+$/, "") // Remove last path segment (bucket name)
      .replace(/\/$/, ""); // Remove trailing slash
  } else if (R2_ACCOUNT_ID) {
    normalizedR2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }

  console.log(`[QR Multiple] R2 Configuration Check:`, {
    hasEndpoint: !!R2_ENDPOINT,
    endpoint: R2_ENDPOINT?.substring(0, 60) + "...",
    normalizedEndpoint: normalizedR2Endpoint?.substring(0, 60) + "...",
    hasAccountId: !!R2_ACCOUNT_ID,
    accountId: R2_ACCOUNT_ID?.substring(0, 10) + "...",
    hasBucket: !!R2_BUCKET,
    bucket: R2_BUCKET,
    hasAccessKey: !!R2_ACCESS_KEY_ID,
    hasSecretKey: !!R2_SECRET_ACCESS_KEY,
    hasPublicUrl: !!R2_PUBLIC_URL,
    publicUrl: R2_PUBLIC_URL,
  });

  const r2Available =
    !!normalizedR2Endpoint &&
    !!R2_BUCKET &&
    !!R2_ACCESS_KEY_ID &&
    !!R2_SECRET_ACCESS_KEY &&
    !!R2_PUBLIC_URL;

  if (r2Available && normalizedR2Endpoint) {
    try {
      // Create R2 client with proper configuration (forcePathStyle is required for R2)
      const r2Client = new S3Client({
        region: "auto",
        endpoint: normalizedR2Endpoint, // Now guaranteed to be string, not null
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID!,
          secretAccessKey: R2_SECRET_ACCESS_KEY!,
        },
        forcePathStyle: true, // CRITICAL: Required for R2
        maxAttempts: 3, // Retry up to 3 times
      });

      // Create R2 key with folder structure: qr-batches/batch-{number}-{date}/filename.zip
      // Use provided batchNumber or generate based on timestamp
      const batchNum = batchNumber || Math.floor(Date.now() / 1000);
      const r2Key = `qr-batches/batch-${batchNum}-${dateStr}/${filename}`;

      if (jobId) await updateJobProgress(jobId, 90, "Mengunggah ZIP ke R2...");
      console.log(`[QR Multiple] Uploading ZIP to R2...`);
      console.log(`[QR Multiple] R2 Key: ${r2Key}`);
      console.log(
        `[QR Multiple] ZIP Size: ${zipBuffer.length} bytes (${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB)`
      );
      console.log(`[QR Multiple] R2 Config:`, {
        bucket: R2_BUCKET,
        endpoint: normalizedR2Endpoint?.substring(0, 50) + "...",
        publicUrl: R2_PUBLIC_URL?.substring(0, 50) + "...",
        hasAccessKey: !!R2_ACCESS_KEY_ID,
        hasSecretKey: !!R2_SECRET_ACCESS_KEY,
      });

      try {
        // Upload to R2
        const uploadCommand = new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: r2Key,
          Body: zipBuffer,
          ContentType: "application/zip",
          CacheControl: "public, max-age=86400", // Cache for 1 day
        });

        await r2Client.send(uploadCommand);
        if (jobId) await updateJobProgress(jobId, 100, "Selesai.");
        console.log(`[QR Multiple] ZIP uploaded to R2 successfully`);

        // Construct public URL
        const base = R2_PUBLIC_URL!.endsWith("/") ? R2_PUBLIC_URL!.slice(0, -1) : R2_PUBLIC_URL!;
        const downloadUrl = `${base}/${r2Key}`;

        console.log(`[QR Multiple] R2 Download URL: ${downloadUrl}`);

        // Response konsisten dengan flow PDF satuan: product_title, product_id, rootkey, download_url
        const product_title = bodyProductTitle ?? firstProduct?.name ?? "Serticard ZIP";
        const product_id = String(firstProduct?.serialCode ?? batchNum);
        const rootkey =
          firstProduct?.rootKey != null && String(firstProduct.rootKey).trim() !== ""
            ? String(firstProduct.rootKey).trim()
            : null;

        return {
          json: {
            success: true,
            product_title,
            product_id,
            rootkey,
            total_files: successCount,
            download_url: downloadUrl,
            downloadUrl,
            filename,
            batchNumber: batchNum,
            fileCount: successCount,
            failedCount: chunkResult.failCount,
            r2Key,
            zipSize: zipBuffer.length,
            message: "ZIP file generated and uploaded to R2 successfully",
          },
          zip: { buffer: zipBuffer, filename },
        };
      } catch (r2UploadError: any) {
        console.error(`[QR Multiple] R2 upload failed:`, {
          error: r2UploadError?.message,
          name: r2UploadError?.name,
          code: r2UploadError?.code,
          stack: r2UploadError?.stack,
          r2Key,
          bucket: R2_BUCKET,
          endpoint: normalizedR2Endpoint,
        });
        // Fall through to direct download if R2 upload fails
        throw r2UploadError;
      }
    } catch (r2Error: any) {
      console.error("[QR Multiple] Failed to upload ZIP to R2, falling back to direct download:", {
        error: r2Error?.message,
        name: r2Error?.name,
        code: r2Error?.code,
        stack: r2Error?.stack,
      });
      // Fallback to direct download if R2 upload fails
    }
  } else {
    console.log("[QR Multiple] R2 not available, using direct download");
  }

  // Fallback: return ZIP buffer when R2 not available or upload failed
  return { zip: { buffer: zipBuffer, filename } };
}

async function processZipJobInBackground(jobId: number): Promise<void> {
  const job = await prisma.qrZipDownloadJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "PENDING") return;

  await prisma.qrZipDownloadJob.update({
    where: { id: jobId },
    data: { status: "PROCESSING", updatedAt: new Date() },
  });

  const payload = job.requestPayload as {
    products?: Array<{
      id: number;
      name: string;
      serialCode: string;
      weight: number;
      isGram?: boolean;
      rootKey?: string | null;
    }>;
    productTitle?: string;
    templateVariant?: string;
    useCustomTemplate?: boolean;
    batchNumber?: number;
    batchId?: number;
    cacheKey?: string;
  };

  const productsData = (payload.products || []).map((p) => ({
    id: p.id,
    name: p.name,
    serialCode: p.serialCode,
    weight: p.weight,
    isGram: p.isGram === true,
    rootKey: p.rootKey ?? null,
  }));

  const validProducts = productsData.filter(
    (p) =>
      p.name &&
      p.serialCode &&
      p.name.trim().length > 0 &&
      p.serialCode.trim().length > 0 &&
      p.serialCode.trim().toUpperCase() !== "0000" &&
      p.name.trim().toUpperCase() !== "0000"
  );

  if (validProducts.length === 0) {
    await prisma.qrZipDownloadJob.update({
      where: { id: jobId },
      data: { status: "FAILED", errorMessage: "No valid products", updatedAt: new Date() },
    });
    return;
  }

  const zipOpts: ZipGenOpts = {
    bodyProductTitle: payload.productTitle,
    templateVariant: payload.templateVariant ?? "01",
    useCustom: payload.useCustomTemplate === true,
    batchNumber: payload.batchNumber ?? payload.batchId ?? Math.floor(Date.now() / 1000),
    isGramRequest: validProducts.some((p) => p.isGram),
    jobId,
  };

  try {
    const outcome = await executeZipGeneration(validProducts, zipOpts);
    if (outcome.json) {
      const ck = job.cacheKey ?? payload.cacheKey;
      if (ck) {
        await prisma.qrZipDownloadCache.upsert({
          where: { cacheKey: ck },
          update: { result: outcome.json as any, lastAccessedAt: new Date(), hitCount: { increment: 1 } },
          create: { cacheKey: ck, result: outcome.json as any, lastAccessedAt: new Date(), hitCount: 1 },
        });
      }
      await prisma.qrZipDownloadJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          result: outcome.json as any,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.qrZipDownloadJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errorMessage: "R2 tidak tersedia atau upload gagal",
          updatedAt: new Date(),
        },
      });
    }
  } catch (e: any) {
    console.error("[QR Multiple] Background job error:", e);
    await prisma.qrZipDownloadJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage: e?.message || String(e),
        updatedAt: new Date(),
      },
    });
  }
}
