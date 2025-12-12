import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifyUrl } from "@/utils/constants";
import QRCode from "qrcode";
import { addProductInfoToQR } from "@/lib/qr";

/**
 * Generate and download QR code as PNG with product info (title and uniqCode)
 * For Page 2 (Gram Products)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { uniqCode: string } }
) {
  try {
    let { uniqCode } = params;
    uniqCode = decodeURIComponent(uniqCode).trim().toUpperCase();

    if (!uniqCode) {
      return new NextResponse("uniqCode is required", { status: 400 });
    }

    // Get gram item with batch info
    const gramItem = await prisma.gramProductItem.findFirst({
      where: { uniqCode },
      include: { batch: true },
    });

    if (!gramItem || !gramItem.batch) {
      console.error("[QR Gram Download PNG] Gram item not found:", uniqCode);
      return new NextResponse("Product not found", { status: 404 });
    }

    if (!gramItem.uniqCode || gramItem.uniqCode.trim().length < 3) {
      console.error("[QR Gram Download PNG] Invalid uniqCode:", gramItem.uniqCode);
      return new NextResponse("Invalid product code", { status: 400 });
    }

    const finalUniqCode = gramItem.uniqCode.trim().toUpperCase();
    const productName = gramItem.batch.name.trim();

    console.log("[QR Gram Download PNG] Generating:", {
      uniqCode: finalUniqCode,
      productName: productName,
    });

    // Generate QR code
    const verifyUrl = getVerifyUrl(finalUniqCode);
    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 560,
      errorCorrectionLevel: "H",
      color: { dark: "#0c0c0c", light: "#ffffff" },
      margin: 1,
    });

    // Add product info (product name above, uniqCode below)
    const pngBuffer = await addProductInfoToQR(qrBuffer, finalUniqCode, productName);

    if (!pngBuffer) {
      throw new Error("Failed to generate PNG with product info");
    }

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${finalUniqCode}_${productName.replace(/\s+/g, "_")}.png"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("[QR Gram Download PNG] Error:", error);
    const errorMsg = error instanceof Error ? error.message : "Failed to generate QR code";
    return new NextResponse(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

