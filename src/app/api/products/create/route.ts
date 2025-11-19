import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productCreateSchema } from "@/lib/validators/product";
import {
  generateSerialCode,
  normalizeSerialCode,
  generateSequentialSerials,
  findHighestSerialNumber,
} from "@/lib/serial";
import { generateAndStoreQR } from "@/lib/qr";

const appBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function POST(request: Request) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = productCreateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const payload = parsed.data;
  const quantity = payload.quantity ?? 1;
  // Batch creation: if serialPrefix is provided, use batch logic (even for quantity = 1)
  // This allows continuation of serial numbers for existing products
  const isBatchCreation = quantity > 1 || (quantity === 1 && !!payload.serialPrefix);

  try {
    // Batch creation: create products with sequential serial numbers (supports continuation)
    if (isBatchCreation && payload.serialPrefix) {
      const serialPrefix = normalizeSerialCode(payload.serialPrefix);

      // Check for existing products with same name and prefix to continue serial numbers
      const existingProducts = await prisma.product.findMany({
        where: {
          name: payload.name.trim(),
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
      if (existingProducts.length > 0) {
        // Find the highest serial number and continue from there
        const existingSerials = existingProducts.map((p) => p.serialCode);
        const highestNumber = findHighestSerialNumber(existingSerials, serialPrefix);
        startNumber = highestNumber + 1;
      }

      // Generate serials starting from the next available number
      const serials = generateSequentialSerials(serialPrefix, quantity, startNumber);

      // Double-check if any of the generated serials already exist (safety check)
      const conflictingSerials = await prisma.product.findMany({
        where: {
          serialCode: {
            in: serials,
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
            existingSerials: conflictingSerials.map((p) => p.serialCode),
          },
          { status: 400 }
        );
      }

      // Create products in batch
      const products = [];
      const baseUrl = appBaseUrl.replace(/\/$/, "");

      for (let i = 0; i < serials.length; i++) {
        const serialCode = serials[i];
        const verifyUrl = `${baseUrl}/verify/${serialCode}`;

        // Generate QR code for each product
        const { url: qrImageUrl } = await generateAndStoreQR(serialCode, verifyUrl);

        // Create product with stock = 1 (one unit per serial number)
        const product = await prisma.product.create({
          data: {
            name: payload.name,
            weight: payload.weight,
            price: payload.price,
            stock: 1, // Each serial number represents one unit
            serialCode,
            qrRecord: {
              create: {
                serialCode,
                qrImageUrl,
              },
            },
          },
          include: {
            qrRecord: true,
          },
        });

        products.push(product);
      }

      return NextResponse.json(
        {
          products,
          count: products.length,
          message: `Successfully created ${products.length} products`,
        },
        { status: 201 }
      );
    }

    // Single product creation
    const serialCode = normalizeSerialCode(payload.serialCode ?? generateSerialCode("SK"));

    // Check if serial already exists
    const existing = await prisma.product.findUnique({
      where: { serialCode },
    });

    if (existing) {
      return NextResponse.json({ error: "Serial code already exists" }, { status: 400 });
    }

    const verifyUrl = `${appBaseUrl.replace(/\/$/, "")}/verify/${serialCode}`;
    const { url: qrImageUrl } = await generateAndStoreQR(serialCode, verifyUrl);

    const product = await prisma.product.create({
      data: {
        name: payload.name,
        weight: payload.weight,
        price: payload.price,
        stock: payload.stock ?? 1,
        serialCode,
        qrRecord: {
          create: {
            serialCode,
            qrImageUrl,
          },
        },
      },
      include: {
        qrRecord: true,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    console.error("Product creation failed:", error);

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Serial code already exists" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create product", details: error.message },
      { status: 500 }
    );
  }
}
