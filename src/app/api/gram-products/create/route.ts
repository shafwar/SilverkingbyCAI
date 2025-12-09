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

// Batch processing configuration for large quantities
const BATCH_SIZE = 100; // Process items in batches of 100
const MAX_QUANTITY = 100000; // Maximum quantity limit for safety

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

  // Validate quantity limit
  if (payload.quantity > MAX_QUANTITY) {
    return NextResponse.json(
      {
        error: `Quantity exceeds maximum limit of ${MAX_QUANTITY.toLocaleString()}. Please contact support for larger batches.`,
      },
      { status: 400 }
    );
  }

  // Business rule: generate per quantity for Page 2 so serials & root keys align with quantity
  const weightGroup = payload.weight < 100 ? "SMALL" : "LARGE";
  const qrMode = payload.quantity > 1 ? "MULTI_QR" : "SINGLE_QR";
  const qrCount = Math.max(payload.quantity, 1);

  console.log("[GramProductCreate] Processing batch:", {
    name: payload.name,
    quantity: payload.quantity,
    qrCount,
    weightGroup,
    qrMode,
  });

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
      payload.serialPrefix && payload.serialPrefix.trim().length > 0;
    const normalizedPrefix = hasSerialPrefix
      ? normalizeSerialCode(payload.serialPrefix.trim())
      : null;

    if (normalizedPrefix) {
      // Use serialPrefix for auto-generation (batch creation or continuation)
      console.log("[GramProductCreate] Using serialPrefix:", normalizedPrefix);
      
      // Find existing serials with this prefix to determine starting number
      const existingItems = await prisma.gramProductItem.findMany({
        where: {
          serialCode: {
            startsWith: normalizedPrefix,
          },
        },
        select: {
          serialCode: true,
        },
        orderBy: {
          serialCode: "desc",
        },
        take: 1000, // Limit to prevent memory issues
      });

      let startNumber = 1;
      if (existingItems.length > 0) {
        const existingSerials = existingItems.map((item) => item.serialCode);
        const highestSerial = findHighestSerialNumber(existingSerials, normalizedPrefix);
        startNumber = highestSerial ? highestSerial + 1 : 1;
        console.log(
          "[GramProductCreate] Starting serial number:",
          startNumber,
          "(highest found:",
          highestSerial || "none",
          ")"
        );
      } else {
        console.log("[GramProductCreate] No existing serials found, starting from 1");
      }
      
      serialCodes = generateSequentialSerials(normalizedPrefix, qrCount, startNumber);
    } else if (payload.serialCode && payload.serialCode.trim().length > 0) {
      // Use explicit serialCode (single item)
      serialCodes = [normalizeSerialCode(payload.serialCode.trim())];
      console.log("[GramProductCreate] Using explicit serialCode:", serialCodes[0]);
    } else {
      // Fallback: generate a default serial code
      serialCodes = generateSequentialSerials("SKP", qrCount, 1);
      console.log("[GramProductCreate] Using default serialPrefix: SKP");
    }

    // Validate serial codes count matches quantity
    if (serialCodes.length !== qrCount) {
      throw new Error(
        `Serial codes count (${serialCodes.length}) does not match quantity (${qrCount})`
      );
    }

    console.log(
      "[GramProductCreate] Generated",
      serialCodes.length,
      "serial codes. First:",
      serialCodes[0],
      "Last:",
      serialCodes[serialCodes.length - 1]
    );

    // Pre-generate all uniqCodes, rootKeys, and rootKeyHashes in memory for better performance
    console.log("[GramProductCreate] Pre-generating uniqCodes and root keys...");
    const itemData: Array<{
      uniqCode: string;
      serialCode: string;
      rootKey: string;
      rootKeyHash: string;
    }> = [];

    for (let i = 0; i < qrCount; i++) {
      // Generate uniqCode with collision check
      let uniqCode: string | undefined;
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

      // Generate root key and hash
      const rootKey = generateRootKey();
      const rootKeyHash = await bcrypt.hash(rootKey, 10);

      itemData.push({
        uniqCode,
        serialCode: serialCodes[i],
        rootKey,
        rootKeyHash,
      });

      // Log progress for large batches
      if ((i + 1) % 1000 === 0) {
        console.log(`[GramProductCreate] Pre-generated ${i + 1}/${qrCount} items...`);
      }
    }

    console.log("[GramProductCreate] Pre-generation complete. Starting QR generation and database insertion...");

    // Process items in batches for better performance and error recovery
    const totalBatches = Math.ceil(qrCount / BATCH_SIZE);
    let processedCount = 0;
    let failedItems: Array<{ index: number; error: string }> = [];

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, qrCount);
      const currentBatch = itemData.slice(batchStart, batchEnd);

      console.log(
        `[GramProductCreate] Processing batch ${batchIndex + 1}/${totalBatches} (items ${batchStart + 1}-${batchEnd})...`
      );

      // Process current batch
      const batchPromises = currentBatch.map(async (itemData, index) => {
        const globalIndex = batchStart + index;
        try {
          // Generate QR code
          const verifyUrl = getVerifyUrl(itemData.uniqCode);
          const qrResult = await generateAndStoreQR(
            itemData.uniqCode,
            verifyUrl,
            payload.name,
            GRAM_QR_FOLDER
          );
          const qrImageUrl = qrResult.url;

          // Create database record
          const item = await prisma.gramProductItem.create({
            data: {
              batchId: batch.id,
              uniqCode: itemData.uniqCode,
              serialCode: itemData.serialCode,
              rootKeyHash: itemData.rootKeyHash,
              rootKey: itemData.rootKey, // Store plain text root key for admin display
              qrImageUrl,
            },
          });

          processedCount++;
          return { ...item, rootKey: itemData.rootKey };
        } catch (error: any) {
          console.error(
            `[GramProductCreate] Failed to create item ${globalIndex + 1} (${itemData.serialCode}):`,
            error.message
          );
          failedItems.push({
            index: globalIndex,
            error: error.message || "Unknown error",
          });
          return null;
        }
      });

      // Wait for current batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      const successfulItems = batchResults
        .filter((result) => result.status === "fulfilled" && result.value !== null)
        .map((result) => (result as PromiseFulfilledResult<any>).value);

      items.push(...successfulItems);

      // Log progress
      console.log(
        `[GramProductCreate] Batch ${batchIndex + 1}/${totalBatches} complete. Processed: ${processedCount}/${qrCount}, Failed: ${failedItems.length}`
      );

      // If too many failures, abort
      if (failedItems.length > qrCount * 0.1) {
        // More than 10% failures
        throw new Error(
          `Too many failures (${failedItems.length}/${qrCount}). Aborting batch creation.`
        );
      }
    }

    // If we have failures, log them but continue
    if (failedItems.length > 0) {
      console.warn(
        `[GramProductCreate] Completed with ${failedItems.length} failures out of ${qrCount} items:`,
        failedItems.slice(0, 10) // Log first 10 failures
      );
    }

    console.log(
      `[GramProductCreate] Batch creation complete. Successfully created ${items.length}/${qrCount} items.`
    );

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
        qrCount: items.length,
        failedCount: failedItems.length,
        failedItems: failedItems.length > 0 ? failedItems.slice(0, 50) : [], // Return first 50 failures
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[GramProductCreate] Error:", error);

    let errorMessage = "Failed to create gram-based product batch";
    let errorDetails: string | undefined;
    let statusCode = 500;

    // Enhanced error handling for Prisma errors
    if (error.code === "P2002") {
      errorDetails = `Unique constraint violation. Field: ${error.meta?.target || "unknown"}`;
      statusCode = 409;
    } else if (error.code === "P2003") {
      errorDetails = `Referenced batch or related record does not exist. Field: ${error.meta?.field_name || "unknown"}`;
      statusCode = 400;
    } else if (error.code === "P2011") {
      errorDetails = `Null constraint violation. Field: ${error.meta?.constraint || "unknown"}`;
      statusCode = 400;
    } else if (error.message) {
      errorDetails = error.message;
      if (error.message.includes("rootKeyHash")) {
        errorDetails =
          "Prisma schema sync issue: rootKeyHash field not recognized. Please restart the Next.js server after running 'npx prisma generate'.";
        statusCode = 500;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        // Include Prisma error code and meta for debugging
        ...(error.code && { prismaCode: error.code }),
        ...(error.meta && { prismaMeta: error.meta }),
      },
      { status: statusCode }
    );
  }
}
