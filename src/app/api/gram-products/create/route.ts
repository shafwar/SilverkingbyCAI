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
    const hasSerialPrefix = payload.serialPrefix && payload.serialPrefix.trim().length > 0;
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

    // Generate ONE uniqCode for the entire batch (for QR code)
    // All items in the batch will share the same uniqCode
    // Each item will have a unique rootKey for verification
    console.log("[GramProductCreate] Generating shared uniqCode for batch...");
    let sharedUniqCode: string | undefined;

    // Generate uniqCode with collision check
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateSerialCode("GK");
      const existing = await prisma.gramProductItem.findUnique({
        where: { uniqCode: candidate },
        select: { id: true },
      });
      if (!existing) {
        sharedUniqCode = candidate;
        break;
      }
      if (attempt === 9) {
        throw new Error("Failed to generate unique QR code after multiple attempts");
      }
    }

    if (!sharedUniqCode) {
      throw new Error("Failed to generate unique QR code");
    }

    console.log("[GramProductCreate] Shared uniqCode for batch:", sharedUniqCode);

    // Pre-generate rootKeys and rootKeyHashes for each item
    // Each item gets a unique rootKey, but shares the same uniqCode
    console.log("[GramProductCreate] Pre-generating root keys for each item...");
    const itemData: Array<{
      uniqCode: string;
      serialCode: string;
      rootKey: string;
      rootKeyHash: string;
    }> = [];

    for (let i = 0; i < qrCount; i++) {
      // Generate unique root key for each item
      const rootKey = generateRootKey();
      const rootKeyHash = await bcrypt.hash(rootKey, 10);

      itemData.push({
        uniqCode: sharedUniqCode, // Same uniqCode for all items in batch
        serialCode: serialCodes[i],
        rootKey, // Unique rootKey per item
        rootKeyHash,
      });

      // Log progress for large batches
      if ((i + 1) % 1000 === 0) {
        console.log(`[GramProductCreate] Pre-generated ${i + 1}/${qrCount} root keys...`);
      }
    }

    console.log(
      "[GramProductCreate] Pre-generation complete. Starting QR generation and database insertion..."
    );

    // Generate QR code ONCE for the entire batch (since all items share the same uniqCode)
    console.log(`[GramProductCreate] Generating QR code for shared uniqCode: ${sharedUniqCode}`);
    const verifyUrl = getVerifyUrl(sharedUniqCode);
    let sharedQrImageUrl: string;
    try {
      const qrResult = await generateAndStoreQR(
        sharedUniqCode,
        verifyUrl,
        payload.name,
        GRAM_QR_FOLDER
      );
      sharedQrImageUrl = qrResult.url;
      console.log(`[GramProductCreate] QR code generated successfully: ${sharedQrImageUrl}`);
    } catch (qrError: any) {
      console.error("[GramProductCreate] QR generation failed:", qrError);
      throw new Error(`Failed to generate QR code: ${qrError.message || "Unknown error"}`);
    }

    // Process items in batches with controlled concurrency
    // Use sequential processing within batches to avoid database connection pool exhaustion
    const totalBatches = Math.ceil(qrCount / BATCH_SIZE);
    let processedCount = 0;
    let failedItems: Array<{ index: number; serialCode?: string; error: string; code?: string }> = [];

    console.log(
      `[GramProductCreate] Starting to process ${qrCount} items in ${totalBatches} batch(es) of ${BATCH_SIZE} items each...`
    );

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, qrCount);
      const currentBatch = itemData.slice(batchStart, batchEnd);

      console.log(
        `[GramProductCreate] Processing batch ${batchIndex + 1}/${totalBatches} (items ${batchStart + 1}-${batchEnd} of ${qrCount})...`
      );

      // Process items sequentially within each batch to ensure all are created
      // This avoids race conditions and database connection pool exhaustion
      const batchItems: any[] = [];
      
      for (let localIndex = 0; localIndex < currentBatch.length; localIndex++) {
        const itemData = currentBatch[localIndex];
        const globalIndex = batchStart + localIndex;
        let lastError: any = null;
        let itemCreated = false;
        
        // Retry up to 3 times for each item
        for (let retryAttempt = 0; retryAttempt < 3; retryAttempt++) {
          try {
            // All items use the same QR image URL (since they share the same uniqCode)
            const qrImageUrl = sharedQrImageUrl;

            // Create database record
            const item = await prisma.gramProductItem.create({
              data: {
                batchId: batch.id,
                uniqCode: itemData.uniqCode, // Shared uniqCode for all items in batch
                serialCode: itemData.serialCode, // Unique serialCode per item
                rootKeyHash: itemData.rootKeyHash, // Unique rootKeyHash per item
                rootKey: itemData.rootKey, // Unique rootKey per item (for admin display)
                qrImageUrl, // Same QR image URL for all items (since uniqCode is shared)
              },
            });

            processedCount++;
            batchItems.push({ ...item, rootKey: itemData.rootKey });
            itemCreated = true;
            
            // Log every 10 items for progress tracking
            if ((globalIndex + 1) % 10 === 0 || globalIndex === qrCount - 1) {
              console.log(
                `[GramProductCreate] Progress: ${globalIndex + 1}/${qrCount} items created (${((globalIndex + 1) / qrCount) * 100).toFixed(1)}%)`
              );
            }
            
            break; // Success, exit retry loop
          } catch (error: any) {
            lastError = error;
            
            // Check if it's a unique constraint violation (duplicate serialCode or uniqCode)
            if (error.code === "P2002") {
              const field = error.meta?.target?.[0] || "unknown";
              console.warn(
                `[GramProductCreate] Unique constraint violation for item ${globalIndex + 1} (${itemData.serialCode}), field: ${field}. Retry ${retryAttempt + 1}/3...`
              );
              
              // If it's a serialCode conflict, check if item already exists
              if (field === "serialCode") {
                const existing = await prisma.gramProductItem.findUnique({
                  where: { serialCode: itemData.serialCode },
                  select: { id: true, batchId: true },
                });
                if (existing && existing.batchId === batch.id) {
                  // Item already exists in this batch, skip it
                  console.log(
                    `[GramProductCreate] Item ${itemData.serialCode} already exists in batch ${batch.id}, skipping...`
                  );
                  itemCreated = true; // Mark as "handled" even though we skip
                  break;
                }
              }
              
              // Wait a bit before retry (exponential backoff)
              if (retryAttempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 100 * (retryAttempt + 1)));
                continue;
              }
            } else {
              // For other errors, log and don't retry
              console.error(
                `[GramProductCreate] Error creating item ${globalIndex + 1} (${itemData.serialCode}):`,
                error.message,
                error.code || ""
              );
              break;
            }
          }
        }
        
        // If item creation failed after all retries
        if (!itemCreated) {
          console.error(
            `[GramProductCreate] Failed to create item ${globalIndex + 1} (${itemData.serialCode}) after 3 attempts:`,
            lastError?.message || "Unknown error",
            lastError?.code || ""
          );
          failedItems.push({
            index: globalIndex,
            serialCode: itemData.serialCode,
            error: lastError?.message || "Unknown error",
            code: lastError?.code || "UNKNOWN",
          });
        }
      }

      items.push(...batchItems);

      // Log batch completion
      console.log(
        `[GramProductCreate] Batch ${batchIndex + 1}/${totalBatches} complete. Created: ${batchItems.length}/${currentBatch.length} items. Total progress: ${items.length}/${qrCount} items created.`
      );
    }

    // After all batches are processed, check if we have enough successful items
    // Only abort if less than 50% success rate (too many failures)
    const successRate = items.length / qrCount;
    if (successRate < 0.5) {
      console.error(
        `[GramProductCreate] Critical: Only ${items.length}/${qrCount} items created (${(successRate * 100).toFixed(1)}% success rate). This is too low.`
      );
      // Don't throw error, but log it - let the response include failed items
    }

    // Log final results
    if (failedItems.length > 0) {
      console.warn(
        `[GramProductCreate] Completed with ${failedItems.length} failures out of ${qrCount} items.`
      );
      console.warn(
        `[GramProductCreate] First 10 failures:`,
        failedItems.slice(0, 10).map((f) => ({
          index: f.index,
          serialCode: f.serialCode || "unknown",
          error: f.error,
          code: f.code,
        }))
      );
    }

    console.log(
      `[GramProductCreate] Batch creation complete. Successfully created ${items.length}/${qrCount} items (${((items.length / qrCount) * 100).toFixed(1)}% success rate).`
    );

    // If no items were created at all, throw error
    if (items.length === 0) {
      throw new Error(
        `Failed to create any items. All ${qrCount} items failed. Check error logs for details.`
      );
    }

    // Return success response even if some items failed
    // Frontend can show warning if failedCount > 0
    const statusCode = items.length === qrCount ? 201 : items.length > 0 ? 207 : 500; // 207 = Multi-Status

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
        expectedCount: qrCount,
        successCount: items.length,
        failedCount: failedItems.length,
        successRate: ((items.length / qrCount) * 100).toFixed(1) + "%",
        failedItems: failedItems.length > 0 ? failedItems.slice(0, 50) : [], // Return first 50 failures
        warning: failedItems.length > 0 
          ? `Some items failed to create (${failedItems.length}/${qrCount}). Check failedItems for details.`
          : undefined,
      },
      { status: statusCode }
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
