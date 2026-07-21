import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2-client";
import sharp from "sharp";

export const maxDuration = 300; // Allow long execution time if hosted on Vercel
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = prisma as any;
    const products = await db.cmsProduct.findMany();
    let compressedCount = 0;
    let skippedCount = 0;
    let errors: string[] = [];

    const results = [];

    for (const product of products) {
      if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
        continue;
      }

      let updated = false;
      const newImages = [...product.images];

      for (let i = 0; i < product.images.length; i++) {
        const imgUrl = product.images[i];

        // Skip already compressed images or external URLs not in R2
        if (imgUrl.endsWith(".webp") || !imgUrl.includes("assets.cahayasilverking.id")) {
          skippedCount++;
          continue;
        }

        try {
          console.log(`[COMPRESS] Fetching ${imgUrl}`);
          const res = await fetch(imgUrl);
          
          if (!res.ok) {
            throw new Error(`Failed to fetch ${imgUrl} - Status: ${res.status}`);
          }

          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          console.log(`[COMPRESS] Original size: ${(buffer.length / 1024).toFixed(2)} KB`);

          const optimizedBuffer = await sharp(buffer)
            .resize({ width: 800, height: 1066, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

          console.log(`[COMPRESS] Optimized size: ${(optimizedBuffer.length / 1024).toFixed(2)} KB`);

          // Generate new key
          const urlParts = imgUrl.split("/");
          const filename = urlParts[urlParts.length - 1];
          const baseName = filename.replace(/\.(jpe?g|png|gif|bmp|tiff)$/i, "");
          
          // Try to extract original path if it exists, otherwise put in products folder
          const key = `static/images/products/compressed-${Date.now()}-${baseName}.webp`;

          const newUrl = await uploadToR2(key, optimizedBuffer, "image/webp");
          
          newImages[i] = newUrl;
          updated = true;
          compressedCount++;
          
          results.push({
            old: imgUrl,
            new: newUrl,
            oldSizeKb: (buffer.length / 1024).toFixed(2),
            newSizeKb: (optimizedBuffer.length / 1024).toFixed(2)
          });

        } catch (err: any) {
          console.error(`[COMPRESS] Error processing ${imgUrl}:`, err);
          errors.push(`Error on ${imgUrl}: ${err.message}`);
        }
      }

      if (updated) {
        await db.cmsProduct.update({
          where: { id: product.id },
          data: { images: newImages }
        });
      }
    }

    return NextResponse.json({
      message: "Compression completed",
      compressed: compressedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      details: results
    });

  } catch (error: any) {
    console.error("[CMS_COMPRESS_ALL_GET]", error);
    return NextResponse.json({ error: "Failed to compress images", details: error.message }, { status: 500 });
  }
}
