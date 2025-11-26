import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateAndStoreQR } from "@/lib/qr";
import { getVerifyUrl } from "@/utils/constants";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { productId, serialCode } = body;

    // If productId provided, regenerate for specific product
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { qrRecord: true },
      });

      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      const verifyUrl = getVerifyUrl(product.serialCode);
      const { url: qrImageUrl } = await generateAndStoreQR(product.serialCode, verifyUrl, product.name);

      // Update or create QR record
      if (product.qrRecord) {
        await prisma.qrRecord.update({
          where: { id: product.qrRecord.id },
          data: { qrImageUrl },
        });
      } else {
        await prisma.qrRecord.create({
          data: {
            productId: product.id,
            serialCode: product.serialCode,
            qrImageUrl,
          },
        });
      }

      return NextResponse.json({ success: true, qrImageUrl });
    }

    // If serialCode provided, regenerate for specific serial
    if (serialCode) {
      const product = await prisma.product.findUnique({
        where: { serialCode },
        include: { qrRecord: true },
      });

      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      const verifyUrl = getVerifyUrl(serialCode);
      const { url: qrImageUrl } = await generateAndStoreQR(serialCode, verifyUrl, product.name);

      if (product.qrRecord) {
        await prisma.qrRecord.update({
          where: { id: product.qrRecord.id },
          data: { qrImageUrl },
        });
      } else {
        await prisma.qrRecord.create({
          data: {
            productId: product.id,
            serialCode,
            qrImageUrl,
          },
        });
      }

      return NextResponse.json({ success: true, qrImageUrl });
    }

    // Check if we should regenerate ALL products (including those with existing QR)
    const { regenerateAll } = body;
    
    // Regenerate all products (with or without QR) if regenerateAll is true
    // Otherwise, only regenerate products without QR
    const allProducts = await prisma.product.findMany({
      include: { qrRecord: true },
    });

    // Filter products based on regenerateAll flag
    const productsToRegenerate = regenerateAll
      ? allProducts // Regenerate ALL products
      : allProducts.filter(
          (product) => !product.qrRecord || !product.qrRecord.qrImageUrl
        ); // Only products without QR

    console.log(`[Regenerate QR] Processing ${productsToRegenerate.length} products (regenerateAll: ${regenerateAll})`);

    const results = [];
    for (const product of productsToRegenerate) {
      try {
        // CRITICAL: Always use product.serialCode from database, ensure it's valid
        if (!product.serialCode || product.serialCode.trim().length < 3) {
          console.error(`[Regenerate QR] Invalid serialCode for product ${product.id}:`, product.serialCode);
          results.push({
            serialCode: product.serialCode || "INVALID",
            success: false,
            error: "Invalid serial code",
          });
          continue;
        }

        const verifyUrl = getVerifyUrl(product.serialCode);
        const { url: qrImageUrl } = await generateAndStoreQR(product.serialCode, verifyUrl, product.name);

        if (product.qrRecord) {
          await prisma.qrRecord.update({
            where: { id: product.qrRecord.id },
            data: {
              qrImageUrl,
              serialCode: product.serialCode, // Ensure serialCode is updated too
            },
          });
        } else {
          await prisma.qrRecord.create({
            data: {
              productId: product.id,
              serialCode: product.serialCode,
              qrImageUrl,
            },
          });
        }

        results.push({
          serialCode: product.serialCode,
          productName: product.name,
          success: true,
        });
        
        console.log(`[Regenerate QR] Successfully regenerated QR for ${product.serialCode} (${product.name})`);
      } catch (error) {
        console.error(`[Regenerate QR] Failed to regenerate QR for ${product.serialCode}:`, error);
        results.push({
          serialCode: product.serialCode,
          productName: product.name,
          success: false,
          error: String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      regenerated: successCount,
      failed: failCount,
      total: results.length,
      regenerateAll: regenerateAll || false,
      results,
    });
  } catch (error) {
    console.error("Error regenerating QR codes:", error);
    return NextResponse.json(
      { error: "Failed to regenerate QR codes", details: String(error) },
      { status: 500 }
    );
  }
}

