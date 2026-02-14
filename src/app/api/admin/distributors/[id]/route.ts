/**
 * Admin API for single Distributor
 * PATCH /api/admin/distributors/[id] - Update
 * DELETE /api/admin/distributors/[id] - Delete
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const distributorUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  storeName: z.string().optional().nullable(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  mapUrl: z.string().optional().nullable(),
  city: z.string().min(1).optional(),
  displayOrder: z.number().int().optional(),
});

async function ensureAdmin() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await ensureAdmin();
  if (authError) return authError;

  try {
    const { id } = await params;
    const distributorId = parseInt(id, 10);
    if (isNaN(distributorId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = distributorUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.storeName !== undefined) updateData.storeName = data.storeName;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.mapUrl !== undefined) updateData.mapUrl = data.mapUrl || null;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

    const distributor = await prisma.distributor.update({
      where: { id: distributorId },
      data: updateData,
    });

    return NextResponse.json(distributor);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Distributor not found" }, { status: 404 });
    }
    console.error("[ADMIN_DISTRIBUTORS_PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update distributor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await ensureAdmin();
  if (authError) return authError;

  try {
    const { id } = await params;
    const distributorId = parseInt(id, 10);
    if (isNaN(distributorId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await prisma.distributor.delete({
      where: { id: distributorId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Distributor not found" }, { status: 404 });
    }
    console.error("[ADMIN_DISTRIBUTORS_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete distributor" },
      { status: 500 }
    );
  }
}
