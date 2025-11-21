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
      const { url: qrImageUrl } = await generateAndStoreQR(product.serialCode, verifyUrl);

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
      const { url: qrImageUrl } = await generateAndStoreQR(serialCode, verifyUrl);

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

    // Regenerate all products without QR
    // First get all products
    const allProducts = await prisma.product.findMany({
      include: { qrRecord: true },
    });

    // Filter products without QR or with null qrImageUrl
    const productsWithoutQR = allProducts.filter(
      (product) => !product.qrRecord || !product.qrRecord.qrImageUrl
    );

    const results = [];
    for (const product of productsWithoutQR) {
      try {
        const verifyUrl = getVerifyUrl(product.serialCode);
        const { url: qrImageUrl } = await generateAndStoreQR(product.serialCode, verifyUrl);

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

        results.push({ serialCode: product.serialCode, success: true });
      } catch (error) {
        console.error(`Failed to regenerate QR for ${product.serialCode}:`, error);
        results.push({ serialCode: product.serialCode, success: false, error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      regenerated: results.filter((r) => r.success).length,
      total: results.length,
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

