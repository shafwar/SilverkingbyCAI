import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      console.error("[QR Preview] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[QR Preview] Fetching products...");
    
    const products = await prisma.product.findMany({
      include: { qrRecord: true },
      orderBy: { createdAt: "desc" },
    });

    console.log(`[QR Preview] Found ${products.length} products`);

    const payload = products.map((product) => ({
      id: product.id,
      name: product.name,
      weight: product.weight,
      serialCode: product.serialCode,
      qrImageUrl: product.qrRecord?.qrImageUrl ?? null,
      createdAt: product.createdAt,
    }));

    console.log("[QR Preview] Returning payload with", payload.length, "items");
    
    return NextResponse.json({ products: payload });
  } catch (error) {
    console.error("[QR Preview] Error fetching QR preview:", error);
    console.error("[QR Preview] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: "Failed to fetch QR preview",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}


