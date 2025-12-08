import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batches = await prisma.gramProductBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          select: {
            id: true,
            uniqCode: true,
            scanCount: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        batches: batches.map((batch) => ({
          id: batch.id,
          name: batch.name,
          weight: batch.weight,
          quantity: batch.quantity,
          qrMode: batch.qrMode,
          weightGroup: batch.weightGroup,
          createdAt: batch.createdAt.toISOString(),
          qrCount: batch.items.length,
          totalScanCount: batch.items.reduce((sum, item) => sum + item.scanCount, 0),
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching gram batches:", error);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}
