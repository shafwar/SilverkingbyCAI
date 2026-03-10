/**
 * Admin API: upload hero image or video for a page. File is stored in R2, key saved in PageMedia.
 * POST formData: page, type (image|video), file
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFileToR2 } from "@/lib/r2-client";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const page = String(formData.get("page") ?? "").trim();
    const type = formData.get("type") as string | null;
    const file = formData.get("file") as File | null;

    if (!page) {
      return NextResponse.json(
        { error: "Missing page" },
        { status: 400 }
      );
    }
    if (type !== "image" && type !== "video") {
      return NextResponse.json(
        { error: "type must be image or video" },
        { status: 400 }
      );
    }
    if (!file || !file.size) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const allowed = type === "image" ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            type === "image"
              ? "Invalid image. Use JPEG, PNG, or WebP."
              : "Invalid video. Use MP4 or WebM.",
        },
        { status: 400 }
      );
    }

    const ext = type === "image" ? (file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg") : file.name.endsWith(".webm") ? "webm" : "mp4";
    const ts = Date.now();
    const key =
      type === "image"
        ? `static/images/pages/${page}-hero-${ts}.${ext}`
        : `static/videos/pages/${page}-hero-${ts}.${ext}`;

    const url = await uploadFileToR2(file, key);

    const existing = await prisma.pageMedia.findUnique({
      where: { pageName: page },
    });

    if (existing) {
      await prisma.pageMedia.update({
        where: { pageName: page },
        data:
          type === "image"
            ? { heroImageR2Key: key }
            : { heroVideoR2Key: key },
      });
    } else {
      await prisma.pageMedia.create({
        data: {
          pageName: page,
          ...(type === "image" ? { heroImageR2Key: key } : { heroVideoR2Key: key }),
        },
      });
    }

    const heroImageUrl = type === "image" ? url : null;
    const heroVideoUrl = type === "video" ? url : null;

    return NextResponse.json({
      url,
      heroImageUrl: heroImageUrl ?? null,
      heroVideoUrl: heroVideoUrl ?? null,
    });
  } catch (error) {
    console.error("[ADMIN_PAGE_MEDIA_UPLOAD]", error);
    return NextResponse.json(
      { error: "Failed to upload. Please try again." },
      { status: 500 }
    );
  }
}
