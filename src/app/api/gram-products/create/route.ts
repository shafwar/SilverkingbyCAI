import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gramProductCreateSchema } from "@/lib/validators/gram-product";
import { generateSerialCode } from "@/lib/serial";
import { generateAndStoreQR } from "@/lib/qr";
import { getVerifyUrl } from "@/utils/constants";

// Folder in R2 for the new gram-based QR assets
const GRAM_QR_FOLDER = "qr-gram";

export async function POST(request: Request) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = gramProductCreateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const payload = parsed.data;

  // Business rules for QR behaviour based on weight
  const isSmallWeight = payload.weight < 100; // 50gr, 100gr, etc.
  const qrMode = isSmallWeight ? "SINGLE_QR" : "PER_UNIT_QR";
  const weightGroup = isSmallWeight ? "SMALL" : "LARGE";

  // For small weights we only create 1 QR regardless of quantity
  const qrCount = isSmallWeight ? 1 : payload.quantity;

  try {
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

    const items = [];

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

      const verifyUrl = getVerifyUrl(uniqCode);
      const { url: qrImageUrl } = await generateAndStoreQR(
        uniqCode,
        verifyUrl,
        payload.name,
        GRAM_QR_FOLDER
      );

      const item = await prisma.gramProductItem.create({
        data: {
          batchId: batch.id,
          uniqCode,
          serialCode: null,
          qrImageUrl,
        },
      });

      items.push(item);
    }

    return NextResponse.json(
      {
        batch: {
          ...batch,
          qrMode,
          weightGroup,
        },
        items,
        qrCount,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Gram product creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create gram-based product batch", details: error.message },
      { status: 500 }
    );
  }
}
