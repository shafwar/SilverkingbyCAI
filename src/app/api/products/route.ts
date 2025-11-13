import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateQRCode, generateSerialNumber } from "@/utils/qrcode";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET all products
export async function GET(request: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST create new product
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, weight, purity, uniqueCode } = body;

    if (!name || !weight) {
      return NextResponse.json(
        { error: "Name and weight are required" },
        { status: 400 }
      );
    }

    // Generate serial number and QR code
    const serialNumber = generateSerialNumber();
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify/${serialNumber}`;
    const qrCode = await generateQRCode(verificationUrl);

    // Create product in database
    const product = await prisma.product.create({
      data: {
        name,
        weight,
        purity: purity || 99.99,
        uniqueCode: uniqueCode || "Be part of this kingdom",
        serialNumber,
        qrCode,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

