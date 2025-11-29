import { NextRequest, NextResponse } from "next/server";
import { getVerifyUrl } from "@/utils/constants";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import PDFDocument from "pdfkit";
import JSZip from "jszip";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import QRCode from "qrcode";
import { createCanvas, loadImage } from "canvas";
import { getSerticardTemplateUrl } from "@/lib/qr";
import { promises as fs } from "fs";
import path from "path";

/**
 * Generate ZIP file with multiple PDFs (one PDF per QR code)
 * Organizes PDFs into subfolders based on weight (gramasi) if different weights exist
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { serialCodes, batchNumber } = body; // batchNumber is optional, used for R2 folder naming

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

    // Create ZIP file (tetap di scope utama function!)
    const zip = new JSZip();
    let successCount = 0;
    let failCount = 0;

    // BATCHING
    const BATCH_SIZE = 100;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      let batchIdx = Math.floor(i / BATCH_SIZE) + 1;
      console.log(`[QR Multiple] Processing batch ${batchIdx}/${Math.ceil(products.length / BATCH_SIZE)}, size: ${batch.length}`);
      for (const product of batch) {
      try {
        console.log(`[QR Multiple] Processing ${product.serialCode}...`);
        
        // Use the same approach as frontend: load template and QR separately, then combine
        // 1. Load template from file system (same as frontend uses)
        const templatePath = path.join(process.cwd(), "public", "images", "serticard", "Serticard-01.png");
        let templateImage;
        try {
          await fs.access(templatePath);
          templateImage = await loadImage(templatePath);
          console.log(`[QR Multiple] Template loaded for ${product.serialCode}, size: ${templateImage.width}x${templateImage.height}`);
        } catch (templateError: any) {
          throw new Error(`Template file not found: ${templateError.message}`);
        }

        // 2. Generate QR code ONLY (same as /api/qr/[serialCode]/qr-only)
        const verifyUrl = getVerifyUrl(product.serialCode);
        const qrBuffer = await QRCode.toBuffer(verifyUrl, {
          width: 800,
          errorCorrectionLevel: "H",
          color: { dark: "#0c0c0c", light: "#ffffff" },
          margin: 2,
        });
        const qrImage = await loadImage(qrBuffer);
        console.log(`[QR Multiple] QR code generated for ${product.serialCode}, size: ${qrImage.width}x${qrImage.height}`);

        // 3. Create canvas and combine (same logic as frontend)
        const canvas = createCanvas(templateImage.width, templateImage.height);
        const ctx = canvas.getContext("2d");

        // Draw template as background
        ctx.drawImage(templateImage, 0, 0);

        // Calculate QR position (same as frontend)
        const qrSize = Math.min(templateImage.width * 0.55, templateImage.height * 0.55, 900);
        const qrX = (templateImage.width - qrSize) / 2; // Center horizontally
        const qrY = templateImage.height * 0.38; // Position vertically

        // Draw white background for QR
        const padding = 8;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2);

        // Draw QR code on template
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

        // Add product name above QR code
        if (product.name) {
          const nameY = qrY - 35;
          const nameFontSize = Math.floor(templateImage.width * 0.025);
          ctx.fillStyle = "#222222";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `${nameFontSize}px Arial, sans-serif`;

          let displayName = product.name;
          const maxWidth = templateImage.width * 0.65;
          const metrics = ctx.measureText(displayName);
          if (metrics.width > maxWidth) {
            while (ctx.measureText(displayName + "...").width > maxWidth && displayName.length > 0) {
              displayName = displayName.slice(0, -1);
            }
            displayName += "...";
          }

          ctx.fillText(displayName, templateImage.width / 2, nameY);
        }

        // Add serial number below QR code
        const serialY = qrY + qrSize + 35;
        const fontSize = Math.floor(templateImage.width * 0.032);
        ctx.fillStyle = "#222222";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${fontSize}px "LucidaSans", "Lucida Console", "Courier New", monospace`;
        ctx.fillText(product.serialCode, templateImage.width / 2, serialY);

        // Get combined image buffer
        const combinedBuffer = canvas.toBuffer("image/png");
        console.log(`[QR Multiple] Combined image generated for ${product.serialCode}, size: ${combinedBuffer.length} bytes`);

        // 4. Create PDF (same as frontend uses jsPDF, but we use PDFKit for backend)
        const doc = new PDFDocument({
          size: [595, 842], // A4 size
          margin: 0,
        });

        const chunks: Buffer[] = [];
        doc.on("data", (chunk) => chunks.push(chunk));

        // Wait for PDF to finish
        const pdfPromise = new Promise<Buffer>((resolve, reject) => {
          doc.on("end", () => {
            const buffer = Buffer.concat(chunks);
            console.log(`[QR Multiple] PDF generated for ${product.serialCode}, size: ${buffer.length}`);
            resolve(buffer);
          });
          doc.on("error", (err) => {
            console.error(`[QR Multiple] PDF generation error for ${product.serialCode}:`, err);
            reject(err);
          });
        });

        // Add combined image to PDF - fit to A4 page
        const dataUrl = `data:image/png;base64,${combinedBuffer.toString("base64")}`;
        doc.image(dataUrl, {
          fit: [595, 842], // Fit to full A4 page
          align: "center",
          valign: "center",
        });

        doc.end();

        const pdfBuffer = await pdfPromise;

        if (!pdfBuffer || pdfBuffer.length === 0) {
          throw new Error(`PDF buffer is empty for ${product.serialCode}`);
        }

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
    
    const normalizedR2Endpoint = R2_ENDPOINT
      ? R2_ENDPOINT.replace(/\/[^\/]+$/, "")
      : R2_ACCOUNT_ID
        ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : null;

    const r2Available =
      !!normalizedR2Endpoint &&
      !!R2_BUCKET &&
      !!R2_ACCESS_KEY_ID &&
      !!R2_SECRET_ACCESS_KEY &&
      !!R2_PUBLIC_URL;

    if (r2Available) {
      try {
        const r2Client = new S3Client({
          region: "auto",
          endpoint: normalizedR2Endpoint,
          credentials: {
            accessKeyId: R2_ACCESS_KEY_ID!,
            secretAccessKey: R2_SECRET_ACCESS_KEY!,
          },
        });

        // Create R2 key with folder structure: qr-batches/batch-{number}-{date}/filename.zip
        // Use provided batchNumber or generate based on timestamp
        const batchNum = batchNumber || Math.floor(Date.now() / 1000);
        const r2Key = `qr-batches/batch-${batchNum}-${dateStr}/${filename}`;
        
        console.log(`[QR Multiple] Uploading ZIP to R2: ${r2Key}, size: ${zipBuffer.length} bytes`);
        console.log(`[QR Multiple] R2 Config:`, {
          bucket: R2_BUCKET,
          endpoint: normalizedR2Endpoint?.substring(0, 50),
          publicUrl: R2_PUBLIC_URL?.substring(0, 50),
        });

        try {
          await r2Client.send(
            new PutObjectCommand({
              Bucket: R2_BUCKET,
              Key: r2Key,
              Body: zipBuffer,
              ContentType: "application/zip",
              CacheControl: "public, max-age=86400", // Cache for 1 day
            })
          );

          const base = R2_PUBLIC_URL!.endsWith("/") ? R2_PUBLIC_URL!.slice(0, -1) : R2_PUBLIC_URL!;
          const downloadUrl = `${base}/${r2Key}`;

          console.log(`[QR Multiple] ZIP uploaded to R2 successfully: ${downloadUrl}`);

          // Return JSON with download URL instead of file
          return NextResponse.json({
            success: true,
            downloadUrl,
            filename,
            batchNumber: batchNum,
            fileCount: successCount,
            failedCount: failCount,
            r2Key,
            message: "ZIP file generated and uploaded to R2 successfully",
          });
        } catch (r2UploadError: any) {
          console.error(`[QR Multiple] R2 upload failed:`, {
            error: r2UploadError?.message,
            stack: r2UploadError?.stack,
            r2Key,
            bucket: R2_BUCKET,
          });
          // Fall through to direct download if R2 upload fails
          throw r2UploadError;
        }
      } catch (r2Error: any) {
        console.error("[QR Multiple] Failed to upload ZIP to R2, falling back to direct download:", {
          error: r2Error?.message,
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
  } catch (error) {
    console.error("Multiple PDF ZIP generation failed:", error);
    return new NextResponse("Failed to generate ZIP file", { status: 500 });
  }
}

