import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gramProductCreateSchema } from "@/lib/validators/gram-product";
import {
  generateSerialCode,
  generateRootKey,
  normalizeSerialCode,
  generateSequentialSerials,
  findHighestSerialNumber,
} from "@/lib/serial";
import { generateAndStoreQR } from "@/lib/qr";
import { getVerifyUrl } from "@/utils/constants";
import bcrypt from "bcrypt";

// Folder in R2 for the new gram-based QR assets
const GRAM_QR_FOLDER = "qr-gram";

export async function POST(request: Request) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  console.log("[GramProductCreate] Received payload:", JSON.stringify(json, null, 2));

  const parsed = gramProductCreateSchema.safeParse(json);

  if (!parsed.success) {
    console.error("[GramProductCreate] Validation failed:", parsed.error.flatten());
    return NextResponse.json(
      {
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  console.log("[GramProductCreate] Validated payload:", JSON.stringify(payload, null, 2));

  // Business rule: generate per quantity for Page 2 so serials & root keys align with quantity
  const weightGroup = payload.weight < 100 ? "SMALL" : "LARGE";
  const qrMode = payload.quantity > 1 ? "MULTI_QR" : "SINGLE_QR";
  const qrCount = Math.max(payload.quantity, 1);

  try {
    console.log("[GramProductCreate] Creating batch...");
    // Create batch record first
    const batch = await prisma.gramProductBatch.create({
      data: {
        name: payload.name.trim(),
        weight: payload.weight,
        quantity: payload.quantity,
        qrMode,
        weightGroup,
      },
    });
    console.log("[GramProductCreate] Batch created:", batch.id);

    const items = [];
    let serialCodes: string[] = [];

    // Determine serial codes based on serialPrefix or serialCode (like Page 1)
    // Safety: ensure serialPrefix exists and is not empty
    const hasSerialPrefix =
      payload.serialPrefix &&
      typeof payload.serialPrefix === "string" &&
      payload.serialPrefix.trim() !== "";
    const hasSerialCode =
      payload.serialCode &&
      typeof payload.serialCode === "string" &&
      payload.serialCode.trim() !== "";

    console.log("[GramProductCreate] Serial check:", {
      hasSerialPrefix,
      hasSerialCode,
      serialPrefix: payload.serialPrefix,
      serialCode: payload.serialCode,
    });

    if (hasSerialPrefix) {
      console.log("[GramProductCreate] Using serialPrefix:", payload.serialPrefix);
      // Use serialPrefix for auto-generation (batch creation or continuation)
      const serialPrefix = normalizeSerialCode(payload.serialPrefix);

      // Check for existing products with same name and prefix to continue serial numbers
      const existingItems = await prisma.gramProductItem.findMany({
        where: {
          batch: {
            name: payload.name.trim(),
          },
          serialCode: {
            startsWith: serialPrefix,
          },
        },
        select: {
          serialCode: true,
        },
        orderBy: {
          serialCode: "desc",
        },
      });

      let startNumber = 1;
      if (existingItems.length > 0) {
        // Find the highest serial number and continue from there
        const existingSerials = existingItems.map((item) => item.serialCode);
        const highestNumber = findHighestSerialNumber(existingSerials, serialPrefix);
        startNumber = highestNumber + 1;
      }

      // Generate serials starting from the next available number
      serialCodes = generateSequentialSerials(serialPrefix, qrCount, startNumber);
      console.log("[GramProductCreate] Generated serial codes:", serialCodes);

      // Double-check if any of the generated serials already exist (safety check)
      const conflictingSerials = await prisma.gramProductItem.findMany({
        where: {
          serialCode: {
            in: serialCodes,
          },
        },
        select: {
          serialCode: true,
        },
      });

      if (conflictingSerials.length > 0) {
        return NextResponse.json(
          {
            error: "Some serial numbers already exist",
            existingSerials: conflictingSerials.map((item) => item.serialCode),
          },
          { status: 400 }
        );
      }
    } else if (hasSerialCode) {
      // Use custom serialCode (single product)
      serialCodes = [payload.serialCode.trim().toUpperCase()];

      // Check if serialCode already exists
      const existingSerial = await prisma.gramProductItem.findUnique({
        where: { serialCode: serialCodes[0] },
        select: { id: true },
      });

      if (existingSerial) {
        return NextResponse.json(
          { error: `Serial code ${serialCodes[0]} already exists` },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error: "Either serialPrefix or serialCode must be provided",
          details:
            "Please provide either a serial prefix (for auto-generation) or a custom serial code",
        },
        { status: 400 }
      );
    }

    for (let i = 0; i < qrCount; i++) {
      // Generate a uniq code for each QR (independent from legacy serials)
      // Prefix "GK" (Gram King) keeps it visually distinct from legacy SK* serials
      let uniqCode: string | undefined;

      // Small retry loop in case of very rare collision on uniqCode
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateSerialCode("GK");

        const existing = await prisma.gramProductItem.findUnique({
          where: { uniqCode: candidate },
          select: { id: true },
        });

        if (!existing) {
          uniqCode = candidate;
          break;
        }

        if (attempt === 4) {
          throw new Error("Failed to generate unique QR code after multiple attempts");
        }
      }

      if (!uniqCode) {
        throw new Error("Failed to generate unique QR code");
      }

      // Generate root key alphanumeric (3-4 chars) for two-step verification
      const rootKey = generateRootKey();
      const rootKeyHash = await bcrypt.hash(rootKey, 10);

      // Use the serial code from the generated list
      const serialCode = serialCodes[i];

      // Gunakan verify URL utama agar diarahkan ke halaman authenticity yang sama
      const verifyUrl = getVerifyUrl(uniqCode);
      console.log("[GramProductCreate] Generating QR for:", { uniqCode, serialCode, verifyUrl });

      let qrImageUrl: string;
      try {
        const qrResult = await generateAndStoreQR(
          uniqCode,
          verifyUrl,
          payload.name,
          GRAM_QR_FOLDER
        );
        qrImageUrl = qrResult.url;
        console.log("[GramProductCreate] QR generated successfully:", qrImageUrl);
      } catch (qrError: any) {
        console.error("[GramProductCreate] QR generation failed:", qrError);
        throw new Error(`Failed to generate QR code: ${qrError.message || "Unknown error"}`);
      }

      console.log("[GramProductCreate] Creating item:", {
        batchId: batch.id,
        uniqCode,
        serialCode,
        rootKey, // Log plain text root key for debugging
        rootKeyHashLength: rootKeyHash.length,
        qrImageUrlLength: qrImageUrl.length,
      });

      // Verify Prisma client recognizes rootKeyHash before creating
      // This will help catch schema sync issues early
      let item;
      try {
        item = await prisma.gramProductItem.create({
          data: {
            batchId: batch.id,
            uniqCode,
            serialCode,
            rootKeyHash,
            rootKey, // Store plain text root key for admin display
            qrImageUrl,
          },
        });
        console.log("[GramProductCreate] Item created successfully:", item.id);
      } catch (createError: any) {
        // Enhanced error logging for Prisma errors
        if (createError.message && createError.message.includes("rootKeyHash")) {
          console.error(
            "[GramProductCreate] CRITICAL: Prisma client does not recognize rootKeyHash!"
          );
          console.error("[GramProductCreate] This usually means:");
          console.error(
            "[GramProductCreate] 1. Prisma client needs to be regenerated: npx prisma generate"
          );
          console.error("[GramProductCreate] 2. Next.js server needs to be restarted");
          console.error("[GramProductCreate] 3. Check that schema.prisma has rootKeyHash field");
          throw new Error(
            `Prisma schema sync issue: rootKeyHash field not recognized. Please restart the Next.js server after running 'npx prisma generate'. Original error: ${createError.message}`
          );
        }
        throw createError; // Re-throw if it's a different error
      }

      items.push({ ...item, rootKey }); // Include rootKey in response for admin display
    }

    return NextResponse.json(
      {
        batch: {
          ...batch,
          qrMode,
          weightGroup,
        },
        items: items.map((item: any) => {
          const { rootKey, ...rest } = item;
          return {
            ...rest,
            rootKey, // Return rootKey for admin to display/share (plain text, not hashed)
          };
        }),
        qrCount,
      },
      { status: 201 }
    );
  } catch (error: any) {
    // Log full error for debugging
    console.error("[GramProductCreate] ========== ERROR START ==========");
    console.error("[GramProductCreate] Error type:", typeof error);
    console.error("[GramProductCreate] Error name:", error?.name);
    console.error("[GramProductCreate] Error message:", error?.message);
    console.error("[GramProductCreate] Error code:", error?.code);
    console.error("[GramProductCreate] Error meta:", JSON.stringify(error?.meta, null, 2));
    console.error("[GramProductCreate] Error stack:", error?.stack);
    console.error(
      "[GramProductCreate] Full error object:",
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    );
    console.error("[GramProductCreate] ========== ERROR END ==========");

    // Better error handling - check for Prisma errors, validation errors, etc.
    let errorMessage = "Failed to create gram-based product batch";
    let errorDetails = error?.message || "Unknown error";

    // Handle Prisma errors
    if (error?.code === "P2002") {
      errorMessage = "Duplicate entry detected";
      const field = error.meta?.target?.[0] || "record";
      errorDetails = `A record with this ${field} already exists. Details: ${JSON.stringify(error.meta)}`;
    } else if (error?.code === "P2003") {
      errorMessage = "Invalid reference";
      errorDetails = `Referenced batch or related record does not exist. Field: ${error.meta?.field_name || "unknown"}`;
    } else if (error?.code === "P2011") {
      errorMessage = "Null constraint violation";
      errorDetails = `Required field is missing: ${error.meta?.constraint || "unknown"}`;
    } else if (error?.message) {
      errorDetails = error.message;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        // Include field errors if available
        ...(error?.fieldErrors && { fieldErrors: error.fieldErrors }),
        // Include Prisma meta for debugging
        ...(error?.meta && { meta: error.meta }),
        // Include error code for easier debugging
        ...(error?.code && { errorCode: error.code }),
      },
      { status: 500 }
    );
  }
}
