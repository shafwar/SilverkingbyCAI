import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, getUserAgent } from "@/lib/request-info";

export async function GET(request: NextRequest, { params }: { params: { serialCode: string } }) {
  try {
    // SECURITY: Normalize and validate serial code input
    // Remove any potentially malicious characters and limit length
    const rawSerial = params.serialCode?.trim() || "";
    const serial = rawSerial.toUpperCase().replace(/[^A-Z0-9]/g, "");

    // SECURITY: Validate serial code format and length
    // Minimum 3 chars, maximum 50 chars to prevent DoS
    if (!serial || serial.length < 3 || serial.length > 50) {
      return NextResponse.json(
        { verified: false, success: false, error: "Invalid serial code format" },
        { status: 400 }
      );
    }

    // SECURITY: Sanitize and limit IP and user agent length
    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);
    const sanitizedUserAgent = userAgent
      ? userAgent.substring(0, 500) // Max 500 chars
      : undefined;

    // --- PATH 1: Legacy Product / QrRecord (Page 1 inventory) ---
    // OPTIMIZATION: Use findUnique with proper error handling
    // SECURITY: Only fetch necessary data, no sensitive information
    const qrRecord = await prisma.qrRecord.findUnique({
      where: { serialCode: serial },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            weight: true,
            serialCode: true,
            price: true,
            stock: true,
            createdAt: true,
          },
        },
        scanLogs: {
          orderBy: { scannedAt: "asc" },
          take: 1,
          select: {
            scannedAt: true,
          },
        },
      },
    });

    if (qrRecord && qrRecord.product) {
      // OPTIMIZATION: Use transaction for atomic updates
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
            ip: ip ? ip.substring(0, 45) : undefined, // IPv6 max length
            userAgent: sanitizedUserAgent,
          },
        }),
      ]);

      const firstScanned = qrRecord.scanLogs[0]?.scannedAt || qrRecord.createdAt;

      const allScanLogs = await prisma.qRScanLog.findMany({
        where: { qrRecordId: qrRecord.id },
        select: { location: true },
      });

      const locations = allScanLogs
        .filter((log) => log.location)
        .map((log) => {
          const parts = log.location!.split(",").map((s) => s.trim());
          return {
            city: parts[0] || "Unknown",
            country: parts[1] || "Unknown",
          };
        })
        .filter(
          (loc, index, self) =>
            index === self.findIndex((l) => l.city === loc.city && l.country === loc.country)
        );

      return NextResponse.json(
        {
          verified: true,
          success: true,
          product: {
            id: qrRecord.product.id,
            name: qrRecord.product.name,
            weight: qrRecord.product.weight,
            purity: "99.99%",
            serialCode: qrRecord.serialCode,
            price: qrRecord.product.price,
            stock: qrRecord.product.stock,
            qrImageUrl: qrRecord.qrImageUrl,
            createdAt: qrRecord.product.createdAt,
          },
          scanCount: qrRecord.scanCount + 1,
          firstScanned: firstScanned.toISOString(),
          locations,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, max-age=60, s-maxage=60",
            "Content-Type": "application/json",
          },
        }
      );
    }

    // --- PATH 2: Gram-based inventory (Page 2) using uniqCode ---
    const gramItem = await prisma.gramProductItem.findUnique({
      where: { uniqCode: serial },
      include: {
        batch: true,
        scanLogs: {
          orderBy: { scannedAt: "asc" },
          take: 1,
          select: {
            scannedAt: true,
          },
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

    // For now, we don't track geo location on gram-based logs, so return empty array
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
          // Expose uniqCode via serialCode field to keep frontend compatible
          serialCode: gramItem.uniqCode,
          price: null,
          // Stock here reflects batch quantity for reference
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
