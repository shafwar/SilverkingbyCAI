import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin: list all distributors (including inactive and soft-deleted for management).
 */
export async function GET() {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const distributors = await prisma.distributor.findMany({
      where: { deletedAt: null },
      orderBy: [{ city: "asc" }, { storeName: "asc" }],
    });

    return NextResponse.json({ distributors });
  } catch (error) {
    console.error("[ADMIN_DISTRIBUTORS_GET]", error);
    return NextResponse.json(
      { error: "Failed to load distributors" },
      { status: 500 }
    );
  }
}

/**
 * Admin: create distributor.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    if (!distributorName || !storeName || !address || !city || !phone) {
      return NextResponse.json(
        {
          error:
            "distributorName, storeName, address, city, and phone are required",
        },
        { status: 400 }
      );
    }

    const created = await prisma.distributor.create({
      data: {
        distributorName: String(distributorName).trim(),
        storeName: String(storeName).trim(),
        address: String(address).trim(),
        city: String(city).trim(),
        phone: String(phone).trim(),
        mapLink:
          mapLink != null && mapLink !== ""
            ? String(mapLink).trim()
            : null,
        status: status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      },
    });

    return NextResponse.json({ distributor: created });
  } catch (error) {
    console.error("[ADMIN_DISTRIBUTORS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create distributor" },
      { status: 500 }
    );
  }
}
