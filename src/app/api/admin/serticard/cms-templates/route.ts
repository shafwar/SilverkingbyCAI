/**
 * GET  — list uploaded CMS serticard spreads
 * POST — upload one spread PNG/JPEG → R2 serticard-templates/… + DB row
 */
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2-client";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_BYTES = 25 * 1024 * 1024;

function slugifyName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s.length > 0 ? s.slice(0, 80) : "template";
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const items = await prisma.serticardUploadedTemplate.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, r2Key: true, createdAt: true },
    });
    return NextResponse.json({ templates: items });
  } catch (e) {
    console.error("[Serticard CMS] GET list error:", e);
    return NextResponse.json({ error: "Failed to list templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const nameRaw = formData.get("name");
    const name =
      typeof nameRaw === "string" && nameRaw.trim().length > 0
        ? nameRaw.trim().slice(0, 120)
        : "Untitled";

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only PNG or JPEG allowed" }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : "jpg";
    const slug = slugifyName(name);
    const unique = randomBytes(4).toString("hex");
    const r2Key = `serticard-templates/${Date.now()}-${slug}-${unique}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type === "image/png" ? "image/png" : "image/jpeg";
    await uploadToR2(r2Key, buffer, contentType, {
      originalName: file.name,
      templateName: name,
      uploadedAt: new Date().toISOString(),
    });

    const row = await prisma.serticardUploadedTemplate.create({
      data: { name, r2Key },
    });

    return NextResponse.json({
      success: true,
      template: { id: row.id, name: row.name, r2Key: row.r2Key, createdAt: row.createdAt },
    });
  } catch (e) {
    console.error("[Serticard CMS] POST upload error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
