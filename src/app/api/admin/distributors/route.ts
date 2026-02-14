/**
 * Admin API for Distributor CRUD
 * POST /api/admin/distributors - Create
 * GET /api/admin/distributors - List (same as public but with admin auth)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const distributorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  storeName: z.string().optional().nullable(),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone is required"),
  mapUrl: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  displayOrder: z.number().int().optional().default(0),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const distributors = await prisma.distributor.findMany({
      orderBy: [{ displayOrder: "asc" }, { city: "asc" }, { id: "asc" }],
    });
    return NextResponse.json(distributors);
  } catch (error) {
    console.error("[ADMIN_DISTRIBUTORS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch distributors" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = distributorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name, storeName, address, phone, mapUrl, city, displayOrder } =
      parsed.data;

    const distributor = await prisma.distributor.create({
      data: {
        name,
        storeName: storeName || null,
        address,
        phone,
        mapUrl: mapUrl || null,
        city,
        displayOrder,
      },
    });

    return NextResponse.json(distributor, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_DISTRIBUTORS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create distributor" },
      { status: 500 }
    );
  }
}
