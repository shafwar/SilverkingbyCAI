import { NextRequest, NextResponse } from "next/server";
import { generateQRWithSerticard } from "@/lib/qr";
import { getVerifyUrl } from "@/utils/constants";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import PDFDocument from "pdfkit";
import JSZip from "jszip";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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
        const verifyUrl = getVerifyUrl(product.serialCode);

        // Generate QR with Serticard template
        const pngBuffer = await generateQRWithSerticard(
          product.serialCode,
          verifyUrl,
          product.name,
          product.weight
        );

        if (!pngBuffer || pngBuffer.length === 0) {
          throw new Error(`Failed to generate PNG buffer for ${product.serialCode}`);
        }

        console.log(`[QR Multiple] PNG generated for ${product.serialCode}, size: ${pngBuffer.length}`);

        // Create PDF
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

        // Add image to PDF - fit to A4 page for print
        // Use data URL approach which is more reliable with PDFKit
        const dataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;
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

