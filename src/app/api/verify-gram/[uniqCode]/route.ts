import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, getUserAgent } from "@/lib/request-info";

/**
 * Verifikasi khusus gram (Page 2), tidak menyentuh Product/QrRecord.
 * Increment scanCount dan log ke GramQRScanLog saja.
 */
export async function GET(request: NextRequest, { params }: { params: { uniqCode: string } }) {
  try {
    const rawSerial = params.uniqCode?.trim() || "";
    const serial = rawSerial.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (!serial || serial.length < 3 || serial.length > 50) {
      return NextResponse.json(
        { verified: false, success: false, error: "Invalid serial code format" },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);
    const sanitizedUserAgent = userAgent ? userAgent.substring(0, 500) : undefined;

    const gramItem = await prisma.gramProductItem.findUnique({
      where: { uniqCode: serial },
      include: {
        batch: true,
        scanLogs: {
          orderBy: { scannedAt: "asc" },
          take: 1,
          select: { scannedAt: true },
        },
      },
    });

    if (!gramItem || !gramItem.batch) {
      return NextResponse.json(
        { verified: false, error: "Serial code not recognized" },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.gramProductItem.update({
        where: { id: gramItem.id },
        data: {
          scanCount: { increment: 1 },
          lastScannedAt: new Date(),
        },
      }),
      prisma.gramQRScanLog.create({
        data: {
          qrItemId: gramItem.id,
          ip: ip ? ip.substring(0, 45) : undefined,
          userAgent: sanitizedUserAgent,
        },
      }),
    ]);

    const gramFirstScanned = gramItem.scanLogs[0]?.scannedAt || gramItem.createdAt;
    const gramLocations: Array<{ city: string; country: string }> = [];

    return NextResponse.json(
      {
        verified: true,
        success: true,
        product: {
          id: gramItem.id,
          name: gramItem.batch.name,
          weight: gramItem.batch.weight,
          purity: "99.99%",
          serialCode: gramItem.uniqCode,
          price: null,
          stock: gramItem.batch.quantity,
          qrImageUrl: gramItem.qrImageUrl,
          createdAt: gramItem.createdAt,
        },
        scanCount: gramItem.scanCount + 1,
        firstScanned: gramFirstScanned.toISOString(),
        locations: gramLocations,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Verification gram API error:", error);
    return NextResponse.json(
      {
        verified: false,
        success: false,
        error: error?.message || "Internal server error during verification",
      },
      { status: 500 }
    );
  }
}
