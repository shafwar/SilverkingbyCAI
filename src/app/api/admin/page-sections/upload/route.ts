/**
 * Admin API: upload section media. File stored in R2, key saved in PageSection.
 * Images: compressed with sharp (quality preserved, max 1920px) then uploaded to R2.
 * Video: uploaded as-is to R2 (max 50 MB).
 * POST formData: page, section, type (image|video), file
 */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToR2, uploadFileToR2 } from "@/lib/r2-client";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB
const MAX_VIDEO_BYTES = 10 * 1024 * 1024; // 10 MB
const IMAGE_MAX_WIDTH = 1920;
const IMAGE_QUALITY = 88; // high quality, minimal visible loss
const IMAGE_MAX_PIXELS = 1920 * 1920 * 4; // limit decode for speed on huge uploads

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
              : "Video too large. Max 10 MB.",
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

    const ts = Date.now();
    const safeSection = section.replace(/[^a-z0-9_-]/gi, "_");
    let url: string;
    let key: string;

    if (type === "image") {
      const buf = Buffer.from(await file.arrayBuffer());
      // Hero sections (home, distributor, etc.): smaller max + quality for faster load, still HD
      const isHero = section.toLowerCase() === "hero";
      const isDistributorHero = isHero && page.toLowerCase() === "distributor";
      const maxW = isDistributorHero ? 1400 : isHero ? 1600 : IMAGE_MAX_WIDTH;
      const quality = isDistributorHero ? 82 : isHero ? 85 : IMAGE_QUALITY;
      const pipeline = sharp(buf, { limitInputPixels: IMAGE_MAX_PIXELS })
        .resize(maxW, undefined, { withoutEnlargement: true })
        .rotate(); // auto-orient from EXIF
      // Hero: prefer WebP for smaller size at same HD quality (except PNG keep PNG)
      const preferWebpForHero = isHero && file.type !== "image/png";
      const outFormat =
        file.type === "image/png"
          ? "png"
          : preferWebpForHero
            ? "webp"
            : file.type === "image/webp"
              ? "webp"
              : "jpeg";
      const ext = outFormat === "png" ? "png" : outFormat === "webp" ? "webp" : "jpg";
      key = `static/page-media/${page}/${safeSection}_${ts}.${ext}`;
      const outBuf =
        outFormat === "png"
          ? await pipeline.png({ compressionLevel: 4 }).toBuffer() // 4 = faster than 6, minimal size diff
          : outFormat === "webp"
            ? await pipeline.webp({ quality }).toBuffer()
            : await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
      const contentType = outFormat === "png" ? "image/png" : outFormat === "webp" ? "image/webp" : "image/jpeg";
      url = await uploadToR2(key, outBuf, contentType, {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      });
    } else {
      const ext = file.name.endsWith(".webm") ? "webm" : "mp4";
      key = `static/page-media/${page}/${safeSection}_${ts}.${ext}`;
      url = await uploadFileToR2(file, key);
    }

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
