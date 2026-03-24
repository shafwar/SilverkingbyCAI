/**
 * Admin API: upload image for journal post hero. Stored in R2.
 * POST formData: file (image)
 * Returns { url, r2Key } so admin can set heroImageR2Key on create/update.
 */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { uploadToR2, getPublicUrl } from "@/lib/r2-client";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB
const IMAGE_MAX_WIDTH = 1600;
const IMAGE_QUALITY = 88;
const IMAGE_MAX_PIXELS = 1920 * 1920 * 4;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !file.size) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image too large. Max 3 MB." }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid image. Use JPEG, PNG, or WebP." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ts = Date.now();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const key = `static/journal-hero/${ts}.${ext}`;

    const pipeline = sharp(buf, { limitInputPixels: IMAGE_MAX_PIXELS })
      .resize(IMAGE_MAX_WIDTH, undefined, { withoutEnlargement: true })
      .rotate();

    const outFormat = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpeg";
    const outBuf =
      outFormat === "png"
        ? await pipeline.png({ compressionLevel: 4 }).toBuffer()
        : outFormat === "webp"
          ? await pipeline.webp({ quality: IMAGE_QUALITY }).toBuffer()
          : await pipeline.jpeg({ quality: IMAGE_QUALITY, mozjpeg: true }).toBuffer();

    const contentType = outFormat === "png" ? "image/png" : outFormat === "webp" ? "image/webp" : "image/jpeg";
    await uploadToR2(key, outBuf, contentType, { originalName: file.name });

    const url = getPublicUrl(key);
    return NextResponse.json({ url, r2Key: key });
  } catch (e) {
    console.error("[ADMIN_JOURNAL_UPLOAD]", e);
    return NextResponse.json({ error: "Failed to upload image." }, { status: 500 });
  }
}
