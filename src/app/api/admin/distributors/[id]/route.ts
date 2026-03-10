import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin: update distributor.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json();
    const {
      distributorName,
      storeName,
      address,
      city,
      phone,
      mapLink,
      status,
    } = body || {};

    const existing = await prisma.distributor.findFirst({
      where: { id: numId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.distributor.update({
      where: { id: numId },
      data: {
        distributorName:
          distributorName != null
            ? String(distributorName).trim()
            : existing.distributorName,
        storeName:
          storeName != null ? String(storeName).trim() : existing.storeName,
        address: address != null ? String(address).trim() : existing.address,
        city: city != null ? String(city).trim() : existing.city,
        phone: phone != null ? String(phone).trim() : existing.phone,
        mapLink:
          mapLink !== undefined
            ? mapLink == null || mapLink === ""
              ? null
              : String(mapLink).trim()
            : existing.mapLink,
        status:
          status === "INACTIVE" || status === "ACTIVE"
            ? status
            : existing.status,
      },
    });

    return NextResponse.json({ distributor: updated });
  } catch (error) {
    console.error("[ADMIN_DISTRIBUTORS_PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update distributor" },
      { status: 500 }
    );
  }
}

/**
 * Admin: soft delete distributor.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const existing = await prisma.distributor.findFirst({
      where: { id: numId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.distributor.update({
      where: { id: numId },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_DISTRIBUTORS_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete distributor" },
      { status: 500 }
    );
  }
}
