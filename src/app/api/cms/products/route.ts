import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// List & create CMS products

export async function GET() {
  try {
    const db = prisma as any;
    const products = await db.cmsProduct.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("[CMS_PRODUCTS_GET]", error);
    return NextResponse.json({ error: "Failed to load CMS products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const {
      name,
      rangeName,
      purity,
      weight,
      description,
      category,
      price,
      images,
    } = body || {};

    if (!name || !description || !category || !weight) {
      return NextResponse.json(
        { error: "name, description, category, and weight are required" },
        { status: 400 },
      );
    }

    const db = prisma as any;
    const created = await db.cmsProduct.create({
      data: {
        name,
        rangeName: rangeName ?? null,
        purity: purity ?? null,
        weight,
        description,
        category,
        price: typeof price === "number" ? price : price ? Number(price) || null : null,
        images: Array.isArray(images) ? images : undefined,
      },
    });

    return NextResponse.json({ product: created });
  } catch (error) {
    console.error("[CMS_PRODUCTS_POST]", error);
    return NextResponse.json({ error: "Failed to create CMS product" }, { status: 500 });
  }
}


