import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, getUserAgent } from "@/lib/request-info";

export async function GET(
  request: NextRequest,
  { params }: { params: { serialCode: string } }
) {
  try {
    const serial = params.serialCode?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (!serial || serial.length < 3) {
      return NextResponse.json(
        { verified: false, success: false, error: "Invalid serial code format" },
        { status: 400 }
      );
    }

  const qrRecord = await prisma.qrRecord.findUnique({
    where: { serialCode: serial },
    include: {
      product: true,
      scanLogs: {
        orderBy: { scannedAt: "asc" },
        take: 1,
      },
    },
  });

  if (!qrRecord || !qrRecord.product) {
    return NextResponse.json(
      { verified: false, error: "Serial code not recognized" },
      { status: 404 }
    );
  }

  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  await prisma.$transaction([
    prisma.qrRecord.update({
      where: { id: qrRecord.id },
      data: {
        scanCount: { increment: 1 },
        lastScannedAt: new Date(),
      },
    }),
    prisma.qRScanLog.create({
      data: {
        qrRecordId: qrRecord.id,
        ip: ip ?? undefined,
        userAgent: userAgent ?? undefined,
      },
    }),
  ]);

  // Get first scan date
  const firstScanned = qrRecord.scanLogs[0]?.scannedAt || qrRecord.createdAt;

  // Get unique locations from scan logs
  const allScanLogs = await prisma.qRScanLog.findMany({
    where: { qrRecordId: qrRecord.id },
    select: { location: true },
  });

  const locations = allScanLogs
    .filter((log) => log.location)
    .map((log) => {
      // Parse location string (format: "City, Country")
      const parts = log.location!.split(",").map((s) => s.trim());
      return {
        city: parts[0] || "Unknown",
        country: parts[1] || "Unknown",
      };
    })
    .filter((loc, index, self) => 
      index === self.findIndex((l) => l.city === loc.city && l.country === loc.country)
    );

    return NextResponse.json({
      verified: true,
      success: true, // Add for backward compatibility
      product: {
        id: qrRecord.product.id,
        name: qrRecord.product.name,
        weight: qrRecord.product.weight,
        purity: "99.99%", // Default purity (not stored in Product model)
        serialCode: qrRecord.serialCode,
        price: qrRecord.product.price,
        stock: qrRecord.product.stock,
        qrImageUrl: qrRecord.qrImageUrl,
        createdAt: qrRecord.product.createdAt,
      },
      scanCount: qrRecord.scanCount + 1,
      firstScanned: firstScanned.toISOString(),
      locations: locations,
    });
  } catch (error: any) {
    console.error("Verification API error:", error);
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

