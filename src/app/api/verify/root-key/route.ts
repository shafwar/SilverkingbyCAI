import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

function normalizeCode(value: unknown): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * POST /api/verify/root-key — verify root key for gram batch items (Page 2).
 * Single indexed lookup — no findMany over entire batch.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const normalizedUniqCode = normalizeCode(body?.uniqCode);
    const normalizedRootKey = normalizeCode(body?.rootKey);

    if (!normalizedUniqCode || normalizedUniqCode.length < 3) {
      return NextResponse.json(
        { verified: false, error: "Invalid uniqCode format" },
        { status: 400 }
      );
    }

    if (!normalizedRootKey || normalizedRootKey.length < 3 || normalizedRootKey.length > 4) {
      return NextResponse.json(
        { verified: false, error: "Root key must be 3-4 alphanumeric characters" },
        { status: 400 }
      );
    }

    let gramItem = await prisma.gramProductItem.findFirst({
      where: {
        uniqCode: normalizedUniqCode,
        rootKey: normalizedRootKey,
      },
      select: {
        id: true,
        uniqCode: true,
        serialCode: true,
        rootKeyHash: true,
        rootKey: true,
      },
    });

    if (!gramItem) {
      const rows = await prisma.$queryRaw<
        Array<{
          id: number;
          uniqCode: string;
          serialCode: string;
          rootKeyHash: string;
          rootKey: string | null;
        }>
      >`
        SELECT id, uniqCode, serialCode, rootKeyHash, rootKey
        FROM GramProductItem
        WHERE uniqCode = ${normalizedUniqCode}
          AND rootKey IS NOT NULL
          AND UPPER(TRIM(rootKey)) = ${normalizedRootKey}
        LIMIT 1
      `;
      gramItem = rows[0] ?? null;
    }

    if (!gramItem) {
      gramItem = await prisma.gramProductItem.findUnique({
        where: { serialCode: normalizedUniqCode },
        select: {
          id: true,
          uniqCode: true,
          serialCode: true,
          rootKeyHash: true,
          rootKey: true,
        },
      });
    }

    if (!gramItem) {
      return NextResponse.json(
        {
          verified: false,
          error: "Product not found. Please check the QR code.",
        },
        { status: 404 }
      );
    }

    if (!gramItem.rootKeyHash) {
      return NextResponse.json(
        { verified: false, error: "Root key not available for this item" },
        { status: 500 }
      );
    }

    let isValid = false;
    if (gramItem.rootKey) {
      isValid = normalizeCode(gramItem.rootKey) === normalizedRootKey;
    }
    if (!isValid) {
      isValid = await bcrypt.compare(normalizedRootKey, gramItem.rootKeyHash);
    }

    if (!isValid) {
      return NextResponse.json(
        {
          verified: false,
          error: `Invalid root key. Please verify the root key for serial code ${gramItem.serialCode}.`,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        verified: true,
        serialCode: gramItem.serialCode,
        uniqCode: gramItem.uniqCode,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error: unknown) {
    console.error("[VerifyRootKey] error:", error);
    return NextResponse.json(
      {
        verified: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
