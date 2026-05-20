import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/r2-client";

/** PATCH — rename CMS spread (label in QR Preview dropdown) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: idStr } = await params;
    const id = Math.floor(Number(idStr));
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const nameRaw = body?.name;
    if (typeof nameRaw !== "string" || nameRaw.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const name = nameRaw.trim().slice(0, 191);
    const existing = await prisma.serticardUploadedTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const row = await prisma.serticardUploadedTemplate.update({
      where: { id },
      data: { name },
      select: { id: true, name: true, r2Key: true, createdAt: true },
    });
    return NextResponse.json({ success: true, template: row });
  } catch (e) {
    console.error("[Serticard CMS] PATCH error:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const id = Math.floor(Number(idStr));
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const row = await prisma.serticardUploadedTemplate.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      await deleteFromR2(row.r2Key);
    } catch (e) {
      console.warn("[Serticard CMS] R2 delete failed (continuing DB delete):", e);
    }

    await prisma.serticardUploadedTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[Serticard CMS] DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
