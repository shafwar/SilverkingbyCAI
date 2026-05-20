import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: RouteParams) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: raw } = await context.params;
    const id = Math.floor(Number(raw));
    if (!Number.isFinite(id) || id < 1) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const row = await prisma.serticardZipRenderIssue.findUnique({
      where: { id },
      select: { id: true, dismissedAt: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.serticardZipRenderIssue.update({
      where: { id },
      data: { dismissedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/serticard-zip-issues/dismiss] PATCH:", error);
    return NextResponse.json(
      { error: "Failed to dismiss", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
