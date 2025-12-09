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

    console.log("[VerifyRootKey] Looking up item with:", {
      normalizedUniqCode,
      normalizedRootKey,
    });

    // Find gram product item by uniqCode (QR code) or fallback to serialCode
    // Try multiple lookup strategies for robustness
    let gramItem = null;
    let lookupMethod = "unknown";

    // Strategy 1: Direct uniqCode lookup (most common case)
    try {
      gramItem = await prisma.gramProductItem.findUnique({
        where: { uniqCode: normalizedUniqCode },
        select: {
          id: true,
          uniqCode: true,
          serialCode: true,
          rootKeyHash: true,
          rootKey: true,
        },
      });
      if (gramItem) {
        lookupMethod = "uniqCode";
      }
    } catch (error: any) {
      console.error("[VerifyRootKey] Error in uniqCode lookup:", error.message);
    }

    // Strategy 2: Fallback to serialCode lookup
    if (!gramItem) {
      try {
        console.log("[VerifyRootKey] Not found by uniqCode, trying serialCode...");
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
        if (gramItem) {
          lookupMethod = "serialCode";
        }
      } catch (error: any) {
        console.error("[VerifyRootKey] Error in serialCode lookup:", error.message);
      }
    }

    // Strategy 3: Try case-insensitive search using raw SQL (MySQL doesn't support mode: "insensitive")
    if (!gramItem) {
      try {
        console.log("[VerifyRootKey] Trying case-insensitive search via raw SQL...");
        const allItems = await prisma.$queryRaw<
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
          WHERE UPPER(uniqCode) = UPPER(${normalizedUniqCode})
             OR UPPER(serialCode) = UPPER(${normalizedUniqCode})
          LIMIT 1
        `;
        if (allItems.length > 0) {
          gramItem = allItems[0];
          lookupMethod = "caseInsensitive";
        }
      } catch (error: any) {
        console.error("[VerifyRootKey] Error in case-insensitive lookup:", error.message);
      }
    }

    if (!gramItem) {
      console.error("[VerifyRootKey] Item not found after all lookup strategies:", {
        normalizedUniqCode,
        providedUniqCode: uniqCode,
      });
      return NextResponse.json(
        { verified: false, error: "Product not found. Please check the QR code." },
        { status: 404 }
      );
    }

    console.log("[VerifyRootKey] Item found:", {
      id: gramItem.id,
      uniqCode: gramItem.uniqCode,
      serialCode: gramItem.serialCode,
      hasRootKeyHash: !!gramItem.rootKeyHash,
      hasRootKeyPlain: !!gramItem.rootKey,
      lookupMethod,
    });

    // Ensure hash exists
    if (!gramItem.rootKeyHash) {
      console.error("[VerifyRootKey] Missing rootKeyHash for item", gramItem.id);
      return NextResponse.json(
        { verified: false, error: "Root key not available for this item" },
        { status: 500 }
      );
    }

    // Verify root key hash with retry logic for robustness
    let isRootKeyValid = false;
    let verificationMethod = "none";

    // Primary verification: bcrypt hash comparison
    try {
      isRootKeyValid = await bcrypt.compare(normalizedRootKey, gramItem.rootKeyHash);
      if (isRootKeyValid) {
        verificationMethod = "bcrypt";
        console.log("[VerifyRootKey] Root key verified via bcrypt hash");
      }
    } catch (bcryptError: any) {
      console.error("[VerifyRootKey] Bcrypt comparison error:", bcryptError.message);
    }

    // Fallback 1: Plain text comparison (for items created before rootKey field was added)
    if (!isRootKeyValid && gramItem.rootKey) {
      try {
        const storedRootKeyNormalized = gramItem.rootKey
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");
        if (storedRootKeyNormalized === normalizedRootKey) {
          console.log("[VerifyRootKey] Root key matched via plain text comparison (fallback)");
          isRootKeyValid = true;
          verificationMethod = "plainText";
        }
      } catch (plainTextError: any) {
        console.error("[VerifyRootKey] Plain text comparison error:", plainTextError.message);
      }
    }

    // Fallback 2: Direct string comparison (case-insensitive, for edge cases)
    if (!isRootKeyValid && gramItem.rootKey) {
      try {
        if (
          gramItem.rootKey.trim().toUpperCase() === normalizedRootKey ||
          gramItem.rootKey.trim().toLowerCase() === normalizedRootKey.toLowerCase()
        ) {
          console.log("[VerifyRootKey] Root key matched via direct string comparison (fallback 2)");
          isRootKeyValid = true;
          verificationMethod = "directString";
        }
      } catch (directError: any) {
        console.error("[VerifyRootKey] Direct string comparison error:", directError.message);
      }
    }

    if (!isRootKeyValid) {
      console.warn("[VerifyRootKey] Invalid root key - all verification methods failed", {
        uniqCode: normalizedUniqCode,
        serialCode: gramItem.serialCode,
        provided: normalizedRootKey,
        providedLength: normalizedRootKey.length,
        storedPlainText: gramItem.rootKey || "N/A",
        storedPlainTextLength: gramItem.rootKey?.length || 0,
        hashLength: gramItem.rootKeyHash.length,
        hashPrefix: gramItem.rootKeyHash.substring(0, 10),
        verificationMethod,
        lookupMethod,
      });
      return NextResponse.json(
        {
          verified: false,
          error: "Invalid root key. Please check the root key and try again.",
        },
        { status: 401 }
      );
    }

    // Root key is valid, return serialCode for redirect
    console.log("[VerifyRootKey] Root key verification successful", {
      itemId: gramItem.id,
      serialCode: gramItem.serialCode,
      verificationMethod,
      lookupMethod,
    });

    return NextResponse.json(
      {
        verified: true,
        serialCode: gramItem.serialCode,
        uniqCode: gramItem.uniqCode, // Include for debugging
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
