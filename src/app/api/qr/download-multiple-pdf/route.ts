import { NextRequest, NextResponse } from "next/server";
import { generateQRWithSerticard } from "@/lib/qr";
import { getVerifyUrl } from "@/utils/constants";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import PDFDocument from "pdfkit";
import JSZip from "jszip";

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
    const { serialCodes } = body;

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
        } catch (error) {
          failCount++;
          console.error(`[QR Multiple] Failed to generate PDF for ${product.serialCode}:`, error);
          // Continue with next product
        }
      }
    }

    console.log(`[QR Multiple] PDF generation complete: ${successCount} success, ${failCount} failed`);

    if (successCount === 0) {
      return NextResponse.json(
        { error: "Failed to generate any PDFs. All products failed." },
        { status: 500 }
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

    // Return ZIP file - Convert Buffer to Uint8Array for NextResponse
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

