import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

/**
 * POST /api/verify/root-key
 *
 * Verifies root key for Page 2 gram products (two-step verification)
 *
 * Body: { uniqCode: string, rootKey: string }
 *
 * Returns: { verified: boolean, serialCode?: string, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uniqCode, rootKey } = body;

    // Validate input
    if (!uniqCode || !rootKey) {
      return NextResponse.json(
        { verified: false, error: "UniqCode and root key are required" },
        { status: 400 }
      );
    }

    // Normalize inputs
    const normalizedUniqCode = uniqCode
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const normalizedRootKey = rootKey
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

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

    // Find gram product item by uniqCode (QR code) or fallback to serialCode
    let gramItem = await prisma.gramProductItem.findUnique({
      where: { uniqCode: normalizedUniqCode },
      select: {
        id: true,
        serialCode: true,
        rootKeyHash: true,
      },
    });

    if (!gramItem) {
      gramItem = await prisma.gramProductItem.findUnique({
        where: { serialCode: normalizedUniqCode },
        select: {
          id: true,
          serialCode: true,
          rootKeyHash: true,
        },
      });
    }

    if (!gramItem) {
      return NextResponse.json({ verified: false, error: "Product not found" }, { status: 404 });
    }

    // Verify root key hash
    const isRootKeyValid = await bcrypt.compare(normalizedRootKey, gramItem.rootKeyHash);

    if (!isRootKeyValid) {
      return NextResponse.json({ verified: false, error: "Invalid root key" }, { status: 401 });
    }

    // Root key is valid, return serialCode for redirect
    return NextResponse.json(
      {
        verified: true,
        serialCode: gramItem.serialCode,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Root key verification error:", error);
    return NextResponse.json(
      {
        verified: false,
        error: error?.message || "Internal server error during root key verification",
      },
      { status: 500 }
    );
  }
}
