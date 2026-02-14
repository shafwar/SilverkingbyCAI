import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/distributors
 * Public endpoint - returns all distributors ordered by displayOrder, then city
 */
export async function GET() {
  try {
    const distributors = await prisma.distributor.findMany({
      orderBy: [{ displayOrder: "asc" }, { city: "asc" }, { id: "asc" }],
    });
    return NextResponse.json(distributors);
  } catch (error) {
    console.error("[DISTRIBUTORS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch distributors" },
      { status: 500 }
    );
  }
}
