import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeSerialCode, findHighestSerialNumber } from "@/lib/serial";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const serialPrefix = searchParams.get("serialPrefix");

  if (!name || !serialPrefix) {
    return NextResponse.json(
      { error: "Name and serialPrefix are required" },
      { status: 400 }
    );
  }

  try {
    const normalizedPrefix = normalizeSerialCode(serialPrefix);

    // Find all products with the same name and serial prefix
    const products = await prisma.product.findMany({
      where: {
        name: name.trim(),
        serialCode: {
          startsWith: normalizedPrefix,
        },
      },
      select: {
        serialCode: true,
      },
      orderBy: {
        serialCode: "desc",
      },
    });

    if (products.length === 0) {
      return NextResponse.json({
        exists: false,
        lastSerial: null,
        lastNumber: 0,
        nextNumber: 1,
        message: "No existing products found with this name and prefix",
      });
    }

    const serials = products.map((p) => p.serialCode);
    const lastNumber = findHighestSerialNumber(serials, normalizedPrefix);
    const nextNumber = lastNumber + 1;

    return NextResponse.json({
      exists: true,
      lastSerial: products[0]?.serialCode || null,
      lastNumber,
      nextNumber,
      totalExisting: products.length,
      message: `Found ${products.length} existing product(s). Last serial: ${products[0]?.serialCode || "N/A"}. Next will start from ${nextNumber}.`,
    });
  } catch (error: any) {
    console.error("Check serial failed:", error);
    return NextResponse.json(
      { error: "Failed to check serial", details: error.message },
      { status: 500 }
    );
  }
}

