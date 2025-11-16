import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    include: { qrRecord: true },
    orderBy: { createdAt: "desc" },
  });

  const payload = products.map((product) => ({
    id: product.id,
    name: product.name,
    weight: product.weight,
    serialCode: product.serialCode,
    qrImageUrl: product.qrRecord?.qrImageUrl ?? null,
    createdAt: product.createdAt,
  }));

  return NextResponse.json({ products: payload });
}


