import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getVerifyUrl } from "@/utils/constants";
import { addProductInfoToQR } from "@/lib/qr";

/**
 * Gram-only QR (dengan teks) untuk Page 2.
 * Tidak pernah menyentuh tabel Product/QrRecord.
 */
export async function GET(request: NextRequest, { params }: { params: { uniqCode: string } }) {
  try {
    let { uniqCode } = params;
    uniqCode = decodeURIComponent(uniqCode).trim().toUpperCase();

    if (!uniqCode) {
      return new NextResponse("uniqCode is required", { status: 400 });
    }

    const gramItem = await prisma.gramProductItem.findUnique({
      where: { uniqCode },
      include: { batch: true },
    });

    if (!gramItem || !gramItem.batch || gramItem.uniqCode.trim().length < 3) {
      return new NextResponse("Gram item not found", { status: 404 });
    }

    // Gunakan verify URL utama agar halaman authenticity tetap sama seperti Page 1
    const verifyUrl = getVerifyUrl(gramItem.uniqCode);

    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 560,
      errorCorrectionLevel: "H",
      color: { dark: "#0c0c0c", light: "#ffffff" },
      margin: 1,
    });

    // Tambahkan nama batch di bawah QR
    const pngBuffer = await addProductInfoToQR(qrBuffer, gramItem.uniqCode, gramItem.batch.name);

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, must-revalidate",
        ETag: `"${gramItem.uniqCode}"`,
      },
    });
  } catch (error) {
    console.error("QR gram generation failed:", error);
    return new NextResponse("Failed to generate QR code", { status: 500 });
  }
}
