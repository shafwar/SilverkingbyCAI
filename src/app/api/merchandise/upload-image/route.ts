import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadFileToR2 } from "@/lib/r2-client";

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

    const allowedTypes = ["image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid image format. Only JPG/JPEG is allowed." },
        { status: 400 }
      );
    }

    const originalName = file.name.toLowerCase().replace(/\s+/g, "-");
    const baseName = originalName.replace(/\.(jpe?g|png|webp|gif|bmp|tiff)$/i, "");
    const timestamp = Date.now();
    const key = `static/images/merchandise/${timestamp}-${baseName}.jpg`;

    const url = await uploadFileToR2(file, key);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error("[MERCHANDISE_UPLOAD_IMAGE]", error);
    return NextResponse.json(
      { error: "Failed to upload image. Please try again." },
      { status: 500 }
    );
  }
}
