import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const OPEN_WHERE: Prisma.SerticardZipRenderIssueWhereInput = { dismissedAt: null };

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl;
    const summaryOnly = url.searchParams.get("summary") === "1";

    const openCount = await prisma.serticardZipRenderIssue.count({ where: OPEN_WHERE });

    if (summaryOnly) {
      return NextResponse.json({ openCount });
    }

    const status = url.searchParams.get("status") === "all" ? "all" : "open";
    const rawLimit = parseInt(url.searchParams.get("limit") || "100", 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(500, Math.max(1, rawLimit)) : 100;

    const issues = await prisma.serticardZipRenderIssue.findMany({
      where: status === "all" ? {} : OPEN_WHERE,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ openCount, issues });
  } catch (error) {
    console.error("[admin/serticard-zip-issues] GET:", error);
    return NextResponse.json(
      { error: "Failed to load ZIP issues", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
