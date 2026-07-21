import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2-client";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Only allow JPEG
    const allowedTypes = ["image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid image format. Only JPG/JPEG is allowed." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Compress and resize image using sharp to ensure optimal loading
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: 800, height: 1066, fit: "inside", withoutEnlargement: true }) // Maintain ~3:4 aspect ratio limit
      .webp({ quality: 80 })
      .toBuffer();

    const originalName = file.name.toLowerCase().replace(/\s+/g, "-");
    const baseName = originalName.replace(/\.(jpe?g|png|webp|gif|bmp|tiff)$/i, "");
    const timestamp = Date.now();
    const key = `static/images/products/${timestamp}-${baseName}.webp`;

    const url = await uploadToR2(key, optimizedBuffer, "image/webp");

    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error("[CMS_PRODUCTS_UPLOAD_IMAGE]", error);
    return NextResponse.json(
      { error: "Failed to upload image. Please try again." },
      { status: 500 }
    );
  }
}


