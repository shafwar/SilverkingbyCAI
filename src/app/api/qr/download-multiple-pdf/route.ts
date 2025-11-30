import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import JSZip from "jszip";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createCanvas, loadImage } from "canvas";
import { promises as fs } from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";

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

    const { serialCodes, batchNumber } = body; // batchNumber is optional, used for R2 folder naming

    if (!serialCodes || !Array.isArray(serialCodes) || serialCodes.length === 0) {
      console.error("[QR Multiple] Invalid serialCodes:", {
        serialCodes,
        type: typeof serialCodes,
      });
      return NextResponse.json(
        { error: "serialCodes array is required and must not be empty" },
        { status: 400 }
      );
    }

    console.log(
      `[QR Multiple] Received request for ${serialCodes.length} serial codes, batchNumber: ${batchNumber}`
    );

    // Get products matching the provided serial codes
    // CRITICAL: Normalize serialCodes to match database format (uppercase, trimmed)
    const normalizedSerialCodes = serialCodes.map((sc: string) => String(sc).trim().toUpperCase());
    console.log(`[QR Multiple] ====== DATABASE QUERY START ======`);
    console.log(`[QR Multiple] Normalized serialCodes:`, {
      original: serialCodes.slice(0, 5),
      normalized: normalizedSerialCodes.slice(0, 5),
      total: normalizedSerialCodes.length,
    });

    // CRITICAL: Query database to get product data (name, serialCode) from database, NOT from R2 template
    const products = await prisma.product.findMany({
      where: {
        serialCode: {
          in: normalizedSerialCodes,
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

    console.log(`[QR Multiple] ====== DATABASE QUERY RESULT ======`);
    console.log(`[QR Multiple] Database query result:`, {
      requestedCount: normalizedSerialCodes.length,
      foundCount: products.length,
      sampleProducts: products.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        serialCode: p.serialCode,
        nameLength: p.name?.length || 0,
        serialCodeLength: p.serialCode?.length || 0,
        nameIsValid: !!(p.name && p.name.trim().length > 0),
        serialCodeIsValid: !!(p.serialCode && p.serialCode.trim().length > 0),
      })),
    });

    if (products.length === 0) {
      console.error(`[QR Multiple] ERROR: No products found for serialCodes:`, {
        requested: normalizedSerialCodes.slice(0, 10),
        total: normalizedSerialCodes.length,
      });
      return NextResponse.json(
        { error: "No products with QR codes found for the provided serial codes" },
        { status: 404 }
      );
    }

    // CRITICAL: Filter out products with missing data BEFORE processing
    // These products will be skipped to prevent "0000" or empty text
    const validProducts = products.filter(
      (p) =>
        p.name &&
        p.serialCode &&
        p.name.trim().length > 0 &&
        p.serialCode.trim().length > 0 &&
        p.serialCode.trim().toUpperCase() !== "0000" &&
        p.name.trim().toUpperCase() !== "0000"
    );

    const invalidProducts = products.filter(
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

    console.log(`[QR Multiple] Valid products count: ${validProducts.length}/${products.length}`);
    console.log(`[QR Multiple] ====== DATABASE QUERY END ======`);

    // Group VALID products by weight (gramasi)
    // CRITICAL: Use validProducts, not products, to ensure we only group valid data
    const productsByWeight = new Map<number, typeof validProducts>();
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
    console.log(
      `[QR Multiple] Will combine QR + template in canvas, then generate PDF with pdf-lib`
    );

    // Pre-load BOTH templates (front and back) once
    // Try R2 first, fallback to local file system
    const R2_PUBLIC_URL_ENV = process.env.R2_PUBLIC_URL;
    const isLocalDev = process.env.NODE_ENV === "development" || !R2_PUBLIC_URL_ENV;

    let frontTemplateImage;
    let backTemplateImage;

    if (isLocalDev) {
      // Local development: load from file system
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

      console.log(`[QR Multiple] Loading templates from file system (development)...`);
      console.log(`[QR Multiple] Front template: ${frontTemplatePath}`);
      console.log(`[QR Multiple] Back template: ${backTemplatePath}`);

      try {
        await fs.access(frontTemplatePath);
        frontTemplateImage = await loadImage(frontTemplatePath);
        console.log(
          `[QR Multiple] Front template loaded: ${frontTemplateImage.width}x${frontTemplateImage.height}`
        );
      } catch (templateError: any) {
        return NextResponse.json(
          {
            success: false,
            error: "Front template file not found",
            message: `Failed to load front template: ${templateError?.message}`,
            path: frontTemplatePath,
          },
          { status: 500 }
        );
      }

      try {
        await fs.access(backTemplatePath);
        backTemplateImage = await loadImage(backTemplatePath);
        console.log(
          `[QR Multiple] Back template loaded: ${backTemplateImage.width}x${backTemplateImage.height}`
        );
      } catch (templateError: any) {
        return NextResponse.json(
          {
            success: false,
            error: "Back template file not found",
            message: `Failed to load back template: ${templateError?.message}`,
            path: backTemplatePath,
          },
          { status: 500 }
        );
      }
    } else {
      // Production: try R2 first, fallback to local
      const base = R2_PUBLIC_URL_ENV!.endsWith("/")
        ? R2_PUBLIC_URL_ENV!.slice(0, -1)
        : R2_PUBLIC_URL_ENV!;
      const frontR2Url = `${base}/templates/serticard-01.png`;
      const backR2Url = `${base}/templates/serticard-02.png`;

      console.log(`[QR Multiple] Loading templates from R2 (production)...`);
      console.log(`[QR Multiple] Front template R2 URL: ${frontR2Url}`);
      console.log(`[QR Multiple] Back template R2 URL: ${backR2Url}`);

      try {
        // Try R2 first
        const frontResponse = await fetch(frontR2Url);
        if (frontResponse.ok) {
          const frontBuffer = Buffer.from(await frontResponse.arrayBuffer());
          frontTemplateImage = await loadImage(frontBuffer);
          console.log(
            `[QR Multiple] Front template loaded from R2: ${frontTemplateImage.width}x${frontTemplateImage.height}`
          );
        } else {
          throw new Error(`R2 front template not found: ${frontResponse.status}`);
        }
      } catch (r2Error: any) {
        // Fallback to local file system
        console.warn(
          `[QR Multiple] Failed to load front template from R2, trying local: ${r2Error?.message}`
        );
        const frontTemplatePath = path.join(
          process.cwd(),
          "public",
          "images",
          "serticard",
          "Serticard-01.png"
        );
        try {
          await fs.access(frontTemplatePath);
          frontTemplateImage = await loadImage(frontTemplatePath);
          console.log(
            `[QR Multiple] Front template loaded from local: ${frontTemplateImage.width}x${frontTemplateImage.height}`
          );
        } catch (localError: any) {
          return NextResponse.json(
            {
              success: false,
              error: "Front template not found in R2 or local",
              message: `R2 error: ${r2Error?.message}, Local error: ${localError?.message}`,
            },
            { status: 500 }
          );
        }
      }

      try {
        // Try R2 first
        const backResponse = await fetch(backR2Url);
        if (backResponse.ok) {
          const backBuffer = Buffer.from(await backResponse.arrayBuffer());
          backTemplateImage = await loadImage(backBuffer);
          console.log(
            `[QR Multiple] Back template loaded from R2: ${backTemplateImage.width}x${backTemplateImage.height}`
          );
        } else {
          throw new Error(`R2 back template not found: ${backResponse.status}`);
        }
      } catch (r2Error: any) {
        // Fallback to local file system
        console.warn(
          `[QR Multiple] Failed to load back template from R2, trying local: ${r2Error?.message}`
        );
        const backTemplatePath = path.join(
          process.cwd(),
          "public",
          "images",
          "serticard",
          "Serticard-02.png"
        );
        try {
          await fs.access(backTemplatePath);
          backTemplateImage = await loadImage(backTemplatePath);
          console.log(
            `[QR Multiple] Back template loaded from local: ${backTemplateImage.width}x${backTemplateImage.height}`
          );
        } catch (localError: any) {
          return NextResponse.json(
            {
              success: false,
              error: "Back template not found in R2 or local",
              message: `R2 error: ${r2Error?.message}, Local error: ${localError?.message}`,
            },
            { status: 500 }
          );
        }
      }
    }

    // Validate that both templates are loaded
    if (!frontTemplateImage) {
      return NextResponse.json(
        {
          success: false,
          error: "Front template not loaded",
          message: "Failed to load front template (Serticard-01.png) from R2 or local",
        },
        { status: 500 }
      );
    }

    if (!backTemplateImage) {
      return NextResponse.json(
        {
          success: false,
          error: "Back template not loaded",
          message: "Failed to load back template (Serticard-02.png) from R2 or local",
        },
        { status: 500 }
      );
    }

    console.log(`[QR Multiple] Both templates loaded successfully:`, {
      front: `${frontTemplateImage.width}x${frontTemplateImage.height}`,
      back: `${backTemplateImage.width}x${backTemplateImage.height}`,
    });

    // Get base URL for internal API calls
    const baseUrl =
      process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const internalBaseUrl = baseUrl.replace(/\/$/, "");

    // Create ZIP file
    const zip = new JSZip();
    let successCount = 0;
    let failCount = 0;

    // Process all VALID products (already filtered above)
    // CRITICAL: Use validProducts, not products, to ensure we only process products with valid data
    for (const product of validProducts) {
      try {
        // CRITICAL: Double-check product data before processing (defensive programming)
        // This ensures we NEVER draw "0000" or empty text
        const productName = String(product.name || "").trim();
        const productSerialCode = String(product.serialCode || "").trim().toUpperCase();

        // Final validation before processing
        if (!productName || productName.length === 0 || productName === "0000") {
          console.error(
            `[QR Multiple] SKIPPING: Invalid product name for product ID ${product.id}: "${productName}"`
          );
          failCount++;
          continue;
        }

        if (!productSerialCode || productSerialCode.length === 0 || productSerialCode === "0000") {
          console.error(
            `[QR Multiple] SKIPPING: Invalid serialCode for product ID ${product.id}: "${productSerialCode}"`
          );
          failCount++;
          continue;
        }

        // CRITICAL: Log product data that will be used for drawing
        console.log(`[QR Multiple] ====== PROCESSING PRODUCT ======`);
        console.log(`[QR Multiple] Product data (from DATABASE, NOT from R2 template):`, {
          id: product.id,
          serialCode: productSerialCode,
          name: productName,
          weight: product.weight,
          serialCodeLength: productSerialCode.length,
          nameLength: productName.length,
        });

        // 1. Get QR code from endpoint (no PDFKit)
        // CRITICAL: Use productSerialCode (validated, uppercased) for QR generation
        const qrUrl = `${internalBaseUrl}/api/qr/${encodeURIComponent(productSerialCode)}/qr-only`;
        console.log(`[QR Multiple] Fetching QR from: ${qrUrl}`);
        const qrResponse = await fetch(qrUrl);
        if (!qrResponse.ok) {
          throw new Error(`Failed to fetch QR for ${productSerialCode}: ${qrResponse.status}`);
        }
        const qrBuffer = Buffer.from(await qrResponse.arrayBuffer());
        const qrImage = await loadImage(qrBuffer);
        console.log(
          `[QR Multiple] QR loaded for ${productSerialCode}: ${qrImage.width}x${qrImage.height}`
        );

        // 2. Create FRONT canvas with QR + template (same as frontend)
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

        // === MATCH SINGLE DOWNLOAD (handleDownload) EXACTLY ===
        // CRITICAL: Use EXACT same logic as frontend handleDownload that works correctly
        // CRITICAL: Use productName and productSerialCode from database (already validated above)
        // DO NOT use data from R2 template - template only provides the background image
        
        // 1. Nama produk di ATAS QR (persis seperti handleDownload)
        // CRITICAL: productName is already validated and trimmed above
        const nameFontSize = Math.floor(frontTemplateImage.width * 0.027); // SAMA dengan handleDownload
        const nameY = qrY - 40; // SAMA dengan handleDownload (bukan -35)
        frontCtx.fillStyle = "#222222";
        frontCtx.textAlign = "center";
        frontCtx.textBaseline = "bottom"; // SAMA dengan handleDownload (bukan "middle")
        frontCtx.font = `${nameFontSize}px Arial, sans-serif`;
        // CRITICAL: Use productName from database (NOT from R2 template)
        frontCtx.fillText(productName, frontTemplateImage.width / 2, nameY);
        console.log(
          `[QR Multiple] Product name drawn (from DATABASE): "${productName}" at Y=${nameY} for serialCode: ${productSerialCode}`
        );

        // 2. Serial code di BAWAH QR (persis seperti handleDownload)
        // CRITICAL: productSerialCode is already validated, trimmed, and uppercased above
        const serialFontSize = Math.floor(frontTemplateImage.width * 0.031); // SAMA dengan handleDownload
        const serialY = qrY + qrSize + 40; // SAMA dengan handleDownload (bukan +35)
        frontCtx.fillStyle = "#222222";
        frontCtx.textAlign = "center";
        frontCtx.textBaseline = "top"; // SAMA dengan handleDownload (bukan "middle")
        frontCtx.font = `${serialFontSize}px 'Lucida Console', 'Menlo', 'Courier New', monospace`; // SAMA dengan handleDownload
        // CRITICAL: Use productSerialCode from database (NOT from R2 template)
        frontCtx.fillText(productSerialCode, frontTemplateImage.width / 2, serialY);
        console.log(
          `[QR Multiple] Serial code drawn (from DATABASE): "${productSerialCode}" at Y=${serialY}`
        );
        console.log(`[QR Multiple] ====== PRODUCT PROCESSING COMPLETE ======`);
        // === END: Persis sama dengan handleDownload ===

        const frontBuffer = frontCanvas.toBuffer("image/png");
        console.log(
          `[QR Multiple] Front image for ${productSerialCode}: ${frontBuffer.length} bytes`
        );

        // 3. Create BACK canvas (no QR, just template)
        // Validate back template is loaded
        if (!backTemplateImage) {
          throw new Error("Back template image is not loaded");
        }

        const backCanvas = createCanvas(backTemplateImage.width, backTemplateImage.height);
        const backCtx = backCanvas.getContext("2d");
        backCtx.drawImage(backTemplateImage, 0, 0);

        const backBuffer = backCanvas.toBuffer("image/png");
        console.log(
          `[QR Multiple] Back image for ${product.serialCode}: ${backBuffer.length} bytes (${backTemplateImage.width}x${backTemplateImage.height})`
        );

        // 4. Generate PDF with LANDSCAPE orientation, side-by-side layout (same as frontend)
        // Calculate optimal page size based on template dimensions to avoid white space
        const templateAspectRatio = frontTemplateImage.width / frontTemplateImage.height;
        const backAspectRatio = backTemplateImage.width / backTemplateImage.height;

        // Use the height of the taller template as page height
        const maxTemplateHeight = Math.max(frontTemplateImage.height, backTemplateImage.height);
        const pageHeight = maxTemplateHeight;

        // Page width = front width + back width + small gap between them
        const gap = 20; // Small gap between front and back (in pixels/points)
        const pageWidth = frontTemplateImage.width + backTemplateImage.width + gap;

        console.log(`[QR Multiple] PDF dimensions for ${product.serialCode}:`, {
          pageWidth,
          pageHeight,
          frontSize: `${frontTemplateImage.width}x${frontTemplateImage.height}`,
          backSize: `${backTemplateImage.width}x${backTemplateImage.height}`,
        });

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Validate buffers before embedding
        if (!frontBuffer || frontBuffer.length === 0) {
          throw new Error(`Front buffer is empty for ${product.serialCode}`);
        }

        if (!backBuffer || backBuffer.length === 0) {
          throw new Error(`Back buffer is empty for ${product.serialCode}`);
        }

        // Embed images - CRITICAL: Both must be embedded
        const frontPngImage = await pdfDoc.embedPng(frontBuffer);
        const backPngImage = await pdfDoc.embedPng(backBuffer);

        // Validate embedded images
        if (!frontPngImage) {
          throw new Error(`Failed to embed front image for ${product.serialCode}`);
        }

        if (!backPngImage) {
          throw new Error(`Failed to embed back image for ${product.serialCode}`);
        }

        console.log(`[QR Multiple] Embedding images to PDF for ${product.serialCode}:`, {
          frontSize: `${frontTemplateImage.width}x${frontTemplateImage.height}`,
          backSize: `${backTemplateImage.width}x${backTemplateImage.height}`,
          pageSize: `${pageWidth}x${pageHeight}`,
          frontBufferSize: frontBuffer.length,
          backBufferSize: backBuffer.length,
        });

        // Add front template (left side) - full size, no scaling
        page.drawImage(frontPngImage, {
          x: 0,
          y: pageHeight - frontTemplateImage.height, // Align to top (PDF coordinates start from bottom)
          width: frontTemplateImage.width,
          height: frontTemplateImage.height,
        });

        // Add back template (right side) - full size, no scaling
        // CRITICAL: This must always be executed - no conditions to skip
        const backX = frontTemplateImage.width + gap;
        const backY = pageHeight - backTemplateImage.height; // Align to top
        page.drawImage(backPngImage, {
          x: backX,
          y: backY,
          width: backTemplateImage.width,
          height: backTemplateImage.height,
        });

        // Verify both images are drawn
        console.log(`[QR Multiple] Both templates drawn to PDF for ${product.serialCode}:`, {
          frontPosition: `(0, ${pageHeight - frontTemplateImage.height})`,
          backPosition: `(${backX}, ${backY})`,
          frontDrawn: true,
          backDrawn: true,
        });

        const pdfBytes = await pdfDoc.save();
        const pdfBuffer = Buffer.from(pdfBytes);

        // Validate PDF was generated with both templates
        if (!pdfBuffer || pdfBuffer.length === 0) {
          throw new Error(`PDF buffer is empty for ${product.serialCode}`);
        }

        // Verify PDF contains both templates by checking size (should be substantial)
        const minExpectedSize = Math.min(frontBuffer.length, backBuffer.length) * 0.5; // At least 50% of one template
        if (pdfBuffer.length < minExpectedSize) {
          console.warn(
            `[QR Multiple] PDF size suspiciously small for ${product.serialCode}: ${pdfBuffer.length} bytes (expected at least ${minExpectedSize})`
          );
        }

        console.log(
          `[QR Multiple] PDF generated for ${product.serialCode}: ${pdfBuffer.length} bytes (with front + back templates)`
        );

        // Sanitize filename
        const sanitizedName = product.name
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9-]/g, "")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        const filename = `QR-${product.serialCode}${sanitizedName ? `-${sanitizedName}` : ""}.pdf`;

        // Determine folder path based on weight grouping
        let folderPath = "";
        if (hasMultipleWeights) {
          folderPath = `${product.weight}gr/`;
        }

        // Add PDF to ZIP
        zip.file(`${folderPath}${filename}`, pdfBuffer);
        successCount++;
        console.log(`[QR Multiple] Added ${folderPath}${filename} to ZIP`);
      } catch (error: any) {
        failCount++;
        const errorMessage = error?.message || String(error);
        const errorStack = error?.stack || "";
        const errorName = error?.name || "UnknownError";
        console.error(`[QR Multiple] Failed to generate PDF for ${product.serialCode}:`, {
          name: errorName,
          message: errorMessage,
          stack: errorStack,
          serialCode: product.serialCode,
          productName: product.name,
          weight: product.weight,
        });
        // Continue with next product - don't throw, just log and continue
      }
    }

    console.log(
      `[QR Multiple] PDF generation complete: ${successCount} success, ${failCount} failed`
    );

    if (successCount === 0) {
      // Get more details about the failure
      const errorDetails = {
        totalProducts: products.length,
        failedCount: failCount,
        message: "Failed to generate any PDFs. All products failed.",
        suggestion:
          "Please check server logs for detailed error messages. Common issues: template file not found, image processing errors, or memory issues.",
        requestedSerialCodes: serialCodes.length,
        foundProducts: products.length,
      };
      console.error("[QR Multiple] All PDFs failed:", errorDetails);
      console.error("[QR Multiple] First few serial codes that failed:", serialCodes.slice(0, 5));
      return NextResponse.json(
        {
          error: errorDetails.message,
          details: errorDetails,
        },
        { status: 500 }
      );
    }

    // Log warning if some failed but not all
    if (failCount > 0) {
      console.warn(
        `[QR Multiple] Partial success: ${successCount} succeeded, ${failCount} failed out of ${products.length} total`
      );
    }

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });

    // Generate filename with date and count
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Silver-King-QR-Codes-${products.length}-${dateStr}.zip`;

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
          console.log(`[QR Multiple] ZIP uploaded to R2 successfully`);

          // Construct public URL
          const base = R2_PUBLIC_URL!.endsWith("/") ? R2_PUBLIC_URL!.slice(0, -1) : R2_PUBLIC_URL!;
          const downloadUrl = `${base}/${r2Key}`;

          console.log(`[QR Multiple] R2 Download URL: ${downloadUrl}`);

          // Return JSON with download URL instead of file
          return NextResponse.json({
            success: true,
            downloadUrl,
            filename,
            batchNumber: batchNum,
            fileCount: successCount,
            failedCount: failCount,
            r2Key,
            zipSize: zipBuffer.length,
            message: "ZIP file generated and uploaded to R2 successfully",
          });
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
        console.error(
          "[QR Multiple] Failed to upload ZIP to R2, falling back to direct download:",
          {
            error: r2Error?.message,
            name: r2Error?.name,
            code: r2Error?.code,
            stack: r2Error?.stack,
          }
        );
        // Fallback to direct download if R2 upload fails
      }
    } else {
      console.log("[QR Multiple] R2 not available, using direct download");
    }

    // Fallback: Return ZIP file directly if R2 is not available or upload failed
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
