import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** PATCH: Update merchandise item (admin only) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json();
    const { category, title, imageUrl, sortOrder } = body ?? {};

    const existing = await prisma.merchandiseItem.findUnique({
      where: { id: numId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const validCategories = ["polo", "knitware", "tshirt_cap"];
    const data: {
      category?: string;
      title?: string | null;
      imageUrl?: string;
      sortOrder?: number;
    } = {};
    if (category !== undefined && validCategories.includes(category)) {
      data.category = category;
    }
    if (title !== undefined) data.title = title || null;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder) || 0;

    const updated = await prisma.merchandiseItem.update({
      where: { id: numId },
      data,
    });
    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error("[MERCHANDISE_PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update merchandise item" },
      { status: 500 }
    );
  }
}

/** DELETE: Remove merchandise item (admin only) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await prisma.merchandiseItem.delete({ where: { id: numId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MERCHANDISE_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete merchandise item" },
      { status: 500 }
    );
  }
}
