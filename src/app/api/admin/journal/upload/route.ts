/**
 * Admin API: upload image for journal post hero. Stored in R2.
 * POST formData: file (image)
 * Returns { url, r2Key } — always optimized WebP (HD-oriented, smaller file size).
 */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { uploadToR2, getPublicUrl } from "@/lib/r2-client";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
/** Allow larger originals; output is re-encoded and resized server-side. */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_EDGE_PX = 2400;
const WEBP_QUALITY = 90;
const IMAGE_MAX_PIXELS = 2400 * 2400 * 4;

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
      return NextResponse.json({ error: "Image too large. Max 12 MB before processing." }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid image. Use JPEG, PNG, or WebP." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ts = Date.now();
    const key = `static/journal-hero/${ts}.webp`;

    const pipeline = sharp(buf, { limitInputPixels: IMAGE_MAX_PIXELS })
      .rotate()
      .resize(MAX_EDGE_PX, MAX_EDGE_PX, { fit: "inside", withoutEnlargement: true });

    const outBuf = await pipeline.webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true }).toBuffer();

    await uploadToR2(key, outBuf, "image/webp", { originalName: file.name.replace(/\.[^.]+$/, ".webp") });

    const url = getPublicUrl(key);
    return NextResponse.json({ url, r2Key: key });
  } catch (e) {
    console.error("[ADMIN_JOURNAL_UPLOAD]", e);
    return NextResponse.json({ error: "Failed to upload image." }, { status: 500 });
  }
}
