/**
 * GET /api/admin/serticard/cms-templates/[id]/preview
 * Admin-only proxy for uploaded spread thumbnail (no public URL required).
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, BUCKET_NAME } from "@/lib/r2-client";

const BUCKET = BUCKET_NAME;

export async function GET(
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
    const row = await prisma.serticardUploadedTemplate.findUnique({
      where: { id },
      select: { r2Key: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: row.r2Key });
    const obj = await r2Client.send(command);
    const body = obj.Body;
    if (!body) return NextResponse.json({ error: "Empty object" }, { status: 404 });
    const buffer = Buffer.from(await body.transformToByteArray());
    const contentType = row.r2Key.endsWith(".png") ? "image/png" : "image/jpeg";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (e) {
    console.error("[Serticard CMS preview]", e);
    return NextResponse.json({ error: "Failed to load preview" }, { status: 500 });
  }
}
