import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      weight,
      price,
      images,
      filterCategory,
      rangeName,
      purity,
      category,
      description,
    } = body || {};

    const db = prisma as any;
    const existing = await db.cmsProduct.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.cmsProduct.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        weight: weight ?? existing.weight,
        price:
          typeof price === "number"
            ? price
            : price
              ? Number(price) || existing.price
              : existing.price,
        images: Array.isArray(images) ? images : existing.images,
        filterCategory: filterCategory ?? existing.filterCategory,
        rangeName: rangeName ?? existing.rangeName,
        purity: purity ?? existing.purity,
        category: category ?? existing.category,
        description: description ?? existing.description,
      },
    });

    return NextResponse.json({ product: updated });
  } catch (error) {
    console.error("[CMS_PRODUCTS_PATCH]", error);
    return NextResponse.json({ error: "Failed to update CMS product" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const db = prisma as any;
    await db.cmsProduct.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CMS_PRODUCTS_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete CMS product" }, { status: 500 });
  }
}


