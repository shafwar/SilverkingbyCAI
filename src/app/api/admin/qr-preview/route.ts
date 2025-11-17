import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
  } catch (error) {
    console.error("Error fetching QR preview:", error);
    return NextResponse.json(
      { error: "Failed to fetch QR preview" },
      { status: 500 }
    );
  }
}


