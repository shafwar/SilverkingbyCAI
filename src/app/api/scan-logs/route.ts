import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = await prisma.qRScanLog.findMany({
    orderBy: { scannedAt: "desc" },
    include: {
      qrRecord: {
        include: { product: true },
      },
    },
    take: Number(request.nextUrl.searchParams.get("limit")) || 50,
  });

  return NextResponse.json({ logs });
}

