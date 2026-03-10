import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2-client";

const IMAGE_MAX_WIDTH = 1600;
const IMAGE_QUALITY = 85; // good quality, smaller file size
const IMAGE_MAX_PIXELS = 4096 * 4096; // limit decode for very large images

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid image format. Use JPG, PNG, or WebP." },
        { status: 400 }
      );
    }

    const originalName = file.name.toLowerCase().replace(/\s+/g, "-");
    const baseName = originalName.replace(/\.(jpe?g|png|webp|gif|bmp|tiff)$/i, "");
    const timestamp = Date.now();
    const key = `static/images/merchandise/${timestamp}-${baseName}.jpg`;

    const buf = Buffer.from(await file.arrayBuffer());
    const pipeline = sharp(buf, { limitInputPixels: IMAGE_MAX_PIXELS })
      .resize(IMAGE_MAX_WIDTH, undefined, { withoutEnlargement: true })
      .rotate();

    const outBuf = await pipeline
      .jpeg({ quality: IMAGE_QUALITY, mozjpeg: true })
      .toBuffer();

    const url = await uploadToR2(key, outBuf, "image/jpeg", {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    });

    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error("[MERCHANDISE_UPLOAD_IMAGE]", error);
    return NextResponse.json(
      { error: "Failed to upload image. Please try again." },
      { status: 500 }
    );
  }
}
