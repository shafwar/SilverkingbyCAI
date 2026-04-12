/**
 * GET /api/admin/serticard/cms-templates/[id]/preview
 * Admin-only proxy for uploaded spread thumbnail (no public URL required).
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});
const BUCKET = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || "silverking-assets";

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
