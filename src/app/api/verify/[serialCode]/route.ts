import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, getUserAgent } from "@/lib/request-info";

function recordGramScan(
  itemId: number,
  ip: string | undefined,
  userAgent: string | undefined
): void {
  void prisma
    .$transaction([
      prisma.gramProductItem.update({
        where: { id: itemId },
        data: {
          scanCount: { increment: 1 },
          lastScannedAt: new Date(),
        },
      }),
      prisma.gramQRScanLog.create({
        data: {
          qrItemId: itemId,
          ip: ip ? ip.substring(0, 45) : undefined,
          userAgent,
        },
      }),
    ])
    .catch((err) => console.error("[Verify] gram scan log failed:", err));
}

function recordLegacyScan(
  qrRecordId: number,
  ip: string | undefined,
  userAgent: string | undefined
): void {
  void prisma
    .$transaction([
      prisma.qrRecord.update({
        where: { id: qrRecordId },
        data: {
          scanCount: { increment: 1 },
          lastScannedAt: new Date(),
        },
      }),
      prisma.qRScanLog.create({
        data: {
          qrRecordId,
          ip: ip ? ip.substring(0, 45) : undefined,
          userAgent,
        },
      }),
    ])
    .catch((err) => console.error("[Verify] legacy scan log failed:", err));
}

export async function GET(request: NextRequest, { params }: { params: { serialCode: string } }) {
  try {
    const rawSerial = params.serialCode?.trim() || "";
    const serial = rawSerial.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (!serial || serial.length < 3 || serial.length > 50) {
      return NextResponse.json(
        { verified: false, success: false, error: "Invalid serial code format" },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const userAgent = getUserAgent(request)?.substring(0, 500);

    let gramItem = await prisma.gramProductItem.findFirst({
      where: { uniqCode: serial },
      select: {
        id: true,
        uniqCode: true,
        serialCode: true,
        qrImageUrl: true,
        scanCount: true,
        createdAt: true,
        lastScannedAt: true,
        batch: {
          select: {
            name: true,
            weight: true,
            quantity: true,
          },
        },
      },
    });

    if (!gramItem) {
      gramItem = await prisma.gramProductItem.findUnique({
        where: { serialCode: serial },
        select: {
          id: true,
          uniqCode: true,
          serialCode: true,
          qrImageUrl: true,
          scanCount: true,
          createdAt: true,
          lastScannedAt: true,
          batch: {
            select: {
              name: true,
              weight: true,
              quantity: true,
            },
          },
        },
      });
    }

    if (gramItem?.batch) {
      const isLookupBySerialCode = serial === gramItem.serialCode;
      const isLookupByUniqCode = serial === gramItem.uniqCode;

      recordGramScan(gramItem.id, ip ?? undefined, userAgent);

      return NextResponse.json(
        {
          verified: true,
          success: true,
          requiresRootKey: isLookupByUniqCode && !isLookupBySerialCode,
          product: {
            id: gramItem.id,
            name: gramItem.batch.name,
            weight: gramItem.batch.weight,
            purity: "99.99%",
            serialCode: isLookupBySerialCode ? gramItem.serialCode : gramItem.uniqCode,
            actualSerialCode: gramItem.serialCode,
            price: null,
            stock: gramItem.batch.quantity,
            qrImageUrl: gramItem.qrImageUrl,
            createdAt: gramItem.createdAt,
          },
          scanCount: gramItem.scanCount + 1,
          firstScanned: (gramItem.lastScannedAt ?? gramItem.createdAt).toISOString(),
          locations: [],
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, max-age=60, s-maxage=60",
          },
        }
      );
    }

    const qrRecord = await prisma.qrRecord.findUnique({
      where: { serialCode: serial },
      select: {
        id: true,
        serialCode: true,
        qrImageUrl: true,
        scanCount: true,
        createdAt: true,
        lastScannedAt: true,
        product: {
          select: {
            id: true,
            name: true,
            weight: true,
            price: true,
            stock: true,
            createdAt: true,
          },
        },
      },
    });

    if (!qrRecord?.product) {
      return NextResponse.json(
        { verified: false, error: "Serial code not recognized" },
        { status: 404 }
      );
    }

    recordLegacyScan(qrRecord.id, ip ?? undefined, userAgent);

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
        firstScanned: (qrRecord.lastScannedAt ?? qrRecord.createdAt).toISOString(),
        locations: [],
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Verification API error:", error);
    return NextResponse.json(
      {
        verified: false,
        success: false,
        error: error instanceof Error ? error.message : "Internal server error during verification",
      },
      { status: 500 }
    );
  }
}
