import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getVerifyUrl } from "@/utils/constants";

/**
 * Gram-only QR (tanpa teks) untuk Page 2.
 * Tidak pernah menyentuh tabel Product/QrRecord.
 */
export async function GET(request: NextRequest, { params }: { params: { uniqCode: string } }) {
  try {
    let { uniqCode } = params;
    uniqCode = decodeURIComponent(uniqCode).trim().toUpperCase();

    if (!uniqCode) {
      return new NextResponse("uniqCode is required", { status: 400 });
    }

    // Note: uniqCode is NOT unique - multiple items can share same uniqCode
    // We just need to get the first item with this uniqCode (they all share the same QR)
    const gramItem = await prisma.gramProductItem.findFirst({
      where: { uniqCode },
      select: { uniqCode: true },
    });

    if (!gramItem || !gramItem.uniqCode || gramItem.uniqCode.trim().length < 3) {
      return new NextResponse("Gram item not found", { status: 404 });
    }

    // Gunakan verify URL utama agar halaman authenticity tetap sama seperti Page 1
    const verifyUrl = getVerifyUrl(gramItem.uniqCode);

    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 800,
      errorCorrectionLevel: "H",
      color: { dark: "#0c0c0c", light: "#ffffff" },
      margin: 2,
    });

    return new NextResponse(new Uint8Array(qrBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, must-revalidate",
        ETag: `"${gramItem.uniqCode}-qr-only"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("QR-only gram generation failed:", error);
    return new NextResponse("Failed to generate QR code", { status: 500 });
  }
}
