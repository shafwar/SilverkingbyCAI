import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public API: list active distributors only (no auth).
 * Used by the public Distributor page.
 */
export async function GET() {
  try {
    const distributors = await prisma.distributor.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
      },
      orderBy: [{ city: "asc" }, { storeName: "asc" }],
    });

    return NextResponse.json({ distributors });
  } catch (error) {
    console.error("[DISTRIBUTORS_GET]", error);
    return NextResponse.json(
      { error: "Failed to load distributors" },
      { status: 500 }
    );
  }
}
