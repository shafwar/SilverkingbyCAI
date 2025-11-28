import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, getUserAgent } from "@/lib/request-info";

export async function GET(
  request: NextRequest,
  { params }: { params: { serialCode: string } }
) {
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
          // SECURITY: Exclude sensitive fields if any
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

  if (!qrRecord || !qrRecord.product) {
    return NextResponse.json(
      { verified: false, error: "Serial code not recognized" },
      { status: 404 }
    );
  }

  // SECURITY: Sanitize and limit IP and user agent length
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  
  // SECURITY: Limit user agent length to prevent DoS
  const sanitizedUserAgent = userAgent 
    ? userAgent.substring(0, 500) // Max 500 chars
    : undefined;
  
  // OPTIMIZATION: Use transaction for atomic updates
  // SECURITY: Increment scan count and log scan in single transaction
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

    // SECURITY: Only return necessary product information
    // OPTIMIZATION: Return minimal data for faster response
    return NextResponse.json(
      {
        verified: true,
        success: true, // Backward compatibility
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
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60", // Cache for 60 seconds
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

