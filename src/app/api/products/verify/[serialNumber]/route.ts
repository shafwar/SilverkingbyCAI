import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { serialNumber: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: {
        serialNumber: params.serialNumber,
      },
    });

    if (!product) {
      return NextResponse.json(
        { 
          verified: false, 
          error: "Product not found. This may be a counterfeit item." 
        },
        { status: 404 }
      );
    }

    // Increment scan count
    await prisma.product.update({
      where: {
        serialNumber: params.serialNumber,
      },
      data: {
        scannedCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json(
      {
        verified: true,
        product: {
          name: product.name,
          weight: product.weight,
          purity: product.purity,
          serialNumber: product.serialNumber,
          uniqueCode: product.uniqueCode,
          createdAt: product.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error verifying product:", error);
    return NextResponse.json(
      { verified: false, error: "Failed to verify product" },
      { status: 500 }
    );
  }
}

