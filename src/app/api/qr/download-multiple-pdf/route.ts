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
      console.error("[QR Multiple] Invalid serialCodes:", { serialCodes, type: typeof serialCodes });
      return NextResponse.json(
        { error: "serialCodes array is required and must not be empty" },
        { status: 400 }
      );
    }

    console.log(`[QR Multiple] Received request for ${serialCodes.length} serial codes, batchNumber: ${batchNumber}`);

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

    // Group products by weight (gramasi)
    const productsByWeight = new Map<number, typeof products>();
    products.forEach((product) => {
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

    // Pre-load template once
    const templatePath = path.join(process.cwd(), "public", "images", "serticard", "Serticard-01.png");
    console.log(`[QR Multiple] Loading template from: ${templatePath}`);
    
    let templateImage;
    try {
      await fs.access(templatePath);
      templateImage = await loadImage(templatePath);
      console.log(`[QR Multiple] Template loaded: ${templateImage.width}x${templateImage.height}`);
    } catch (templateError: any) {
      return NextResponse.json(
        {
          success: false,
          error: "Template file not found",
          message: `Failed to load template: ${templateError?.message}`,
          path: templatePath,
        },
        { status: 500 }
      );
    }

    // Get base URL for internal API calls
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const internalBaseUrl = baseUrl.replace(/\/$/, "");

    // Create ZIP file
    const zip = new JSZip();
    let successCount = 0;
    let failCount = 0;

    // Process all products
    for (const product of products) {
      try {
        console.log(`[QR Multiple] Processing ${product.serialCode}...`);
        
        // 1. Get QR code from endpoint (no PDFKit)
        const qrUrl = `${internalBaseUrl}/api/qr/${encodeURIComponent(product.serialCode)}/qr-only`;
        const qrResponse = await fetch(qrUrl);
        if (!qrResponse.ok) {
          throw new Error(`Failed to fetch QR: ${qrResponse.status}`);
        }
        const qrBuffer = Buffer.from(await qrResponse.arrayBuffer());
        const qrImage = await loadImage(qrBuffer);
        console.log(`[QR Multiple] QR loaded for ${product.serialCode}: ${qrImage.width}x${qrImage.height}`);

        // 2. Combine QR + template in canvas (same as frontend)
        const canvas = createCanvas(templateImage.width, templateImage.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(templateImage, 0, 0);
        
        const qrSize = Math.min(templateImage.width * 0.55, templateImage.height * 0.55, 900);
        const qrX = (templateImage.width - qrSize) / 2;
        const qrY = templateImage.height * 0.38;
        
        const padding = 8;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2);
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
        
        // Add product name and serial (same as frontend)
        if (product.name) {
          const nameY = qrY - 35;
          const nameFontSize = Math.floor(templateImage.width * 0.025);
          ctx.fillStyle = "#222222";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `${nameFontSize}px Arial, sans-serif`;
          ctx.fillText(product.name, templateImage.width / 2, nameY);
        }
        
        const serialY = qrY + qrSize + 35;
        const fontSize = Math.floor(templateImage.width * 0.032);
        ctx.fillStyle = "#222222";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${fontSize}px Arial, sans-serif`;
        ctx.fillText(product.serialCode, templateImage.width / 2, serialY);
        
        const combinedBuffer = canvas.toBuffer("image/png");
        console.log(`[QR Multiple] Combined image for ${product.serialCode}: ${combinedBuffer.length} bytes`);

        // 3. Generate PDF using pdf-lib (no fontconfig errors)
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]); // A4
        const pngImage = await pdfDoc.embedPng(combinedBuffer);
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: 595,
          height: 842,
        });
        
        const pdfBytes = await pdfDoc.save();
        const pdfBuffer = Buffer.from(pdfBytes);
        console.log(`[QR Multiple] PDF generated for ${product.serialCode}: ${pdfBuffer.length} bytes`);

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

    console.log(`[QR Multiple] PDF generation complete: ${successCount} success, ${failCount} failed`);

    if (successCount === 0) {
      // Get more details about the failure
      const errorDetails = {
        totalProducts: products.length,
        failedCount: failCount,
        message: "Failed to generate any PDFs. All products failed.",
        suggestion: "Please check server logs for detailed error messages. Common issues: template file not found, image processing errors, or memory issues.",
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
      console.warn(`[QR Multiple] Partial success: ${successCount} succeeded, ${failCount} failed out of ${products.length} total`);
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
      normalizedR2Endpoint = R2_ENDPOINT
        .replace(/\/[^\/]+$/, "") // Remove last path segment (bucket name)
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
        console.log(`[QR Multiple] ZIP Size: ${zipBuffer.length} bytes (${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
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

