/**
 * Admin API: upload section media. File stored in R2, key saved in PageSection.
 * POST formData: page, section, type (image|video), file
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFileToR2 } from "@/lib/r2-client";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB
const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80 MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const page = String(formData.get("page") ?? "").trim();
    const section = String(formData.get("section") ?? "").trim();
    const type = formData.get("type") as string | null;
    const file = formData.get("file") as File | null;

    if (!page || !section) {
      return NextResponse.json(
        { error: "Missing page or section" },
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

    const maxBytes = type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error:
            type === "image"
              ? "Image too large. Max 3 MB."
              : "Video too large. Max 80 MB.",
        },
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

    const ext =
      type === "image"
        ? file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg"
        : file.name.endsWith(".webm")
          ? "webm"
          : "mp4";
    const ts = Date.now();
    const safeSection = section.replace(/[^a-z0-9_-]/gi, "_");
    const key = `static/page-media/${page}/${safeSection}_${ts}.${ext}`;

    const url = await uploadFileToR2(file, key);

    const mediaType = type === "image" ? "IMAGE" : "VIDEO";
    await prisma.pageSection.upsert({
      where: {
        pageName_sectionKey: { pageName: page, sectionKey: section },
      },
      create: {
        pageName: page,
        sectionKey: section,
        mediaType,
        r2Key: key,
      },
      update: { mediaType, r2Key: key },
    });

    return NextResponse.json({ url, section, mediaType });
  } catch (error) {
    console.error("[ADMIN_PAGE_SECTIONS_UPLOAD]", error);
    return NextResponse.json(
      { error: "Failed to upload. Please try again." },
      { status: 500 }
    );
  }
}
