import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type MerchandiseCategory = "polo" | "knitware" | "tshirt_cap";

/** GET: List all merchandise items (public), grouped by category */
export async function GET() {
  try {
    const items = await prisma.merchandiseItem.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    });
    const byCategory = {
      polo: items.filter((i) => i.category === "polo"),
      knitware: items.filter((i) => i.category === "knitware"),
      tshirt_cap: items.filter((i) => i.category === "tshirt_cap"),
    };
    return NextResponse.json({ items, byCategory });
  } catch (error) {
    console.error("[MERCHANDISE_GET]", error);
    return NextResponse.json(
      { error: "Failed to load merchandise" },
      { status: 500 }
    );
  }
}

/** POST: Create merchandise item (admin only) */
export async function POST(request: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { category, title, imageUrl, sortOrder } = body ?? {};

    if (!category || !imageUrl) {
      return NextResponse.json(
        { error: "category and imageUrl are required" },
        { status: 400 }
      );
    }

    const validCategories = ["polo", "knitware", "tshirt_cap"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "category must be polo, knitware, or tshirt_cap" },
        { status: 400 }
      );
    }

    const created = await prisma.merchandiseItem.create({
      data: {
        category,
        title: title ?? null,
        imageUrl,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    console.error("[MERCHANDISE_POST]", error);
    return NextResponse.json(
      { error: "Failed to create merchandise item" },
      { status: 500 }
    );
  }
}
