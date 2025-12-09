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

    // Normalize inputs - ensure consistent normalization
    const normalizedUniqCode = String(uniqCode || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const normalizedRootKey = String(rootKey || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    console.log("[VerifyRootKey] Input normalization:", {
      originalUniqCode: uniqCode,
      normalizedUniqCode,
      originalRootKey: rootKey,
      normalizedRootKey,
    });

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

    // Find gram product item by uniqCode AND rootKey
    // Since uniqCode can be shared within a batch, we need to match BOTH uniqCode and rootKey
    // This ensures we get the correct serialCode for the specific item
    let gramItem = null;
    let lookupMethod = "unknown";

    // Strategy 1: Find by uniqCode AND rootKey (PRIMARY - most accurate)
    // This handles the case where multiple items share the same uniqCode but have different rootKeys
    try {
      const itemsWithUniqCode = await prisma.gramProductItem.findMany({
        where: { uniqCode: normalizedUniqCode },
        select: {
          id: true,
          uniqCode: true,
          serialCode: true,
          rootKeyHash: true,
          rootKey: true,
        },
      });

      console.log("[VerifyRootKey] Found items with uniqCode:", itemsWithUniqCode.length);

      if (itemsWithUniqCode.length > 0) {
        // IMPORTANT: All items in a batch share the same uniqCode
        // We MUST match by rootKey to find the correct item
        console.log("[VerifyRootKey] Matching by rootKey among items with same uniqCode...");
        
        // Find the item with matching rootKey
        for (const item of itemsWithUniqCode) {
          if (item.rootKey) {
            const storedRootKeyNormalized = String(item.rootKey)
              .trim()
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "");
            
            if (storedRootKeyNormalized === normalizedRootKey) {
              gramItem = item;
              lookupMethod = "uniqCodeAndRootKey";
              console.log("[VerifyRootKey] ✅ Matched item by uniqCode + rootKey:", {
                serialCode: gramItem.serialCode,
                rootKey: gramItem.rootKey,
              });
              break;
            }
          }
        }

        // If still not found, log all available rootKeys for debugging
        if (!gramItem) {
          console.warn("[VerifyRootKey] ❌ No matching rootKey found among items with same uniqCode:", {
            uniqCode: normalizedUniqCode,
            providedRootKey: normalizedRootKey,
            totalItemsWithUniqCode: itemsWithUniqCode.length,
            availableRootKeys: itemsWithUniqCode.map((item) => ({
              serialCode: item.serialCode,
              rootKey: item.rootKey,
            })),
          });
        }
      }
    } catch (error: any) {
      console.error("[VerifyRootKey] Error in uniqCode + rootKey lookup:", error.message);
    }

    // Strategy 2: Fallback to serialCode lookup (if uniqCode lookup failed)
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
          console.log("[VerifyRootKey] Found via case-insensitive search:", gramItem);
        }
      } catch (error: any) {
        console.error("[VerifyRootKey] Error in case-insensitive lookup:", error.message);
      }
    }

    // Strategy 4: Try partial match (in case of typos or similar codes)
    if (!gramItem) {
      try {
        console.log("[VerifyRootKey] Trying partial match search...");
        const partialMatches = await prisma.gramProductItem.findMany({
          where: {
            OR: [
              { uniqCode: { contains: normalizedUniqCode.substring(0, 10) } },
              { serialCode: { contains: normalizedUniqCode.substring(0, 6) } },
            ],
          },
          select: {
            id: true,
            uniqCode: true,
            serialCode: true,
            rootKeyHash: true,
            rootKey: true,
          },
          take: 5,
        });

        if (partialMatches.length > 0) {
          console.log("[VerifyRootKey] Found partial matches:", partialMatches.length);
          // Use the first match if only one, or log all for debugging
          if (partialMatches.length === 1) {
            gramItem = partialMatches[0];
            lookupMethod = "partialMatch";
            console.log("[VerifyRootKey] Using single partial match:", gramItem);
          } else {
            console.log(
              "[VerifyRootKey] Multiple partial matches found, cannot determine unique item"
            );
          }
        }
      } catch (error: any) {
        console.error("[VerifyRootKey] Error in partial match lookup:", error.message);
      }
    }

    if (!gramItem) {
      // Try one more time with exact match on original uniqCode (before normalization)
      try {
        const exactMatch = await prisma.gramProductItem.findUnique({
          where: { uniqCode: uniqCode.trim() },
          select: {
            id: true,
            uniqCode: true,
            serialCode: true,
            rootKeyHash: true,
            rootKey: true,
          },
        });
        if (exactMatch) {
          gramItem = exactMatch;
          lookupMethod = "exactOriginal";
          console.log("[VerifyRootKey] Found with exact original uniqCode:", gramItem);
        }
      } catch (error: any) {
        console.error("[VerifyRootKey] Error in exact original lookup:", error.message);
      }
    }

    if (!gramItem) {
      console.error("[VerifyRootKey] Item not found after all lookup strategies:", {
        normalizedUniqCode,
        providedUniqCode: uniqCode,
        lookupStrategiesTried: [
          "uniqCode",
          "serialCode",
          "caseInsensitive",
          "partialMatch",
          "exactOriginal",
        ],
      });

      // Provide helpful error message
      return NextResponse.json(
        {
          verified: false,
          error: `Product not found. Please check the QR code. UniqCode: ${uniqCode}`,
          hint: "The QR code may be invalid or the product may not exist in the database.",
        },
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

    // PRIMARY VERIFICATION: Plain text comparison (since we store plain text rootKey)
    // This should be the main verification method for current implementation
    if (gramItem.rootKey) {
      try {
        // Normalize stored root key exactly like input - ensure consistent normalization
        const storedRootKeyNormalized = String(gramItem.rootKey || "")
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");

        console.log("[VerifyRootKey] Plain text comparison:", {
          storedOriginal: gramItem.rootKey,
          storedNormalized: storedRootKeyNormalized,
          providedOriginal: rootKey,
          providedNormalized: normalizedRootKey,
          exactMatch: storedRootKeyNormalized === normalizedRootKey,
          storedLength: storedRootKeyNormalized.length,
          providedLength: normalizedRootKey.length,
        });

        // Try exact match first (most common case)
        if (storedRootKeyNormalized === normalizedRootKey) {
          console.log(
            "[VerifyRootKey] ✅ Root key matched via plain text comparison (PRIMARY METHOD)"
          );
          isRootKeyValid = true;
          verificationMethod = "plainText";
        } else {
          // Log detailed mismatch for debugging
          console.warn("[VerifyRootKey] Plain text mismatch:", {
            stored: gramItem.rootKey,
            storedNormalized: storedRootKeyNormalized,
            provided: rootKey,
            providedNormalized: normalizedRootKey,
            match: storedRootKeyNormalized === normalizedRootKey,
            charByChar: {
              stored: storedRootKeyNormalized.split(""),
              provided: normalizedRootKey.split(""),
            },
          });
        }
      } catch (plainTextError: any) {
        console.error("[VerifyRootKey] Plain text comparison error:", plainTextError.message);
      }
    } else {
      console.warn("[VerifyRootKey] No plain text rootKey available, using bcrypt only");
    }

    // Fallback: bcrypt hash comparison (for backward compatibility)
    if (!isRootKeyValid) {
      try {
        console.log("[VerifyRootKey] Trying bcrypt comparison as fallback...");
        isRootKeyValid = await bcrypt.compare(normalizedRootKey, gramItem.rootKeyHash);
        if (isRootKeyValid) {
          verificationMethod = "bcrypt";
          console.log("[VerifyRootKey] ✅ Root key verified via bcrypt hash (fallback)");
        } else {
          // Log bcrypt mismatch for debugging
          console.warn("[VerifyRootKey] Bcrypt comparison also failed:", {
            normalizedRootKey,
            hashPrefix: gramItem.rootKeyHash.substring(0, 20),
          });
        }
      } catch (bcryptError: any) {
        console.error("[VerifyRootKey] Bcrypt comparison error:", bcryptError.message);
      }
    }

    // Fallback 2: Direct string comparison (case-insensitive, for edge cases)
    if (!isRootKeyValid && gramItem.rootKey) {
      try {
        const storedUpper = gramItem.rootKey.trim().toUpperCase();
        const storedLower = gramItem.rootKey.trim().toLowerCase();
        const providedUpper = normalizedRootKey.toUpperCase();
        const providedLower = normalizedRootKey.toLowerCase();

        if (
          storedUpper === providedUpper ||
          storedLower === providedLower ||
          storedUpper === providedLower ||
          storedLower === providedUpper
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
      // Enhanced error logging with detailed comparison
      const storedNormalized = gramItem.rootKey
        ? gramItem.rootKey
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
        : "N/A";

      console.warn("[VerifyRootKey] Invalid root key - all verification methods failed", {
        uniqCode: normalizedUniqCode,
        serialCode: gramItem.serialCode,
        provided: normalizedRootKey,
        providedOriginal: rootKey,
        providedLength: normalizedRootKey.length,
        storedPlainText: gramItem.rootKey || "N/A",
        storedNormalized: storedNormalized,
        storedPlainTextLength: gramItem.rootKey?.length || 0,
        hashLength: gramItem.rootKeyHash.length,
        hashPrefix: gramItem.rootKeyHash.substring(0, 10),
        verificationMethod,
        lookupMethod,
        comparison: {
          exactMatch: storedNormalized === normalizedRootKey,
          stored: storedNormalized,
          provided: normalizedRootKey,
        },
      });

      // Provide helpful error message without exposing sensitive data
      // In production, don't expose the actual root key for security
      const errorMessage =
        process.env.NODE_ENV === "development" && gramItem.rootKey
          ? `Invalid root key. Expected: ${gramItem.rootKey}, Provided: ${rootKey.trim()}. Please check the root key from the admin panel for serial code ${gramItem.serialCode}.`
          : `Invalid root key. Please check the root key from the admin panel for serial code ${gramItem.serialCode} and try again.`;

      return NextResponse.json(
        {
          verified: false,
          error: errorMessage,
          // Include helpful hint
          hint: `Please verify the root key for serial code ${gramItem.serialCode} from the admin panel.`,
          // Include hint for debugging (only in development)
          ...(process.env.NODE_ENV === "development" && {
            debug: {
              serialCode: gramItem.serialCode,
              uniqCode: gramItem.uniqCode,
              storedRootKey: gramItem.rootKey,
              providedRootKey: rootKey,
              normalizedProvided: normalizedRootKey,
            },
          }),
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
