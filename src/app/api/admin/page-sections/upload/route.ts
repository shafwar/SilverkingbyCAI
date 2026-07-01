/**
 * Admin API: upload section media. File stored in R2, key saved in PageSection.
 * Images: compressed with sharp (quality preserved, max 1920px) then uploaded to R2.
 * Hero video: re-encoded (ffmpeg H.264 CRF 22, max 1080p, faststart) + WebP poster → R2.
 * POST formData: page, section, type (image|video), file
 */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToR2, getPublicUrl } from "@/lib/r2-client";
import { transcodePageHeroVideoForWeb } from "@/lib/transcode-page-hero-video";
import { extractHeroPosterWebpFromVideo } from "@/lib/extract-hero-poster-from-video";
import { HERO_POSTER_SECTION_KEY } from "@/lib/page-hero-cms-config";

/** Allow hero ffmpeg pass on slow hosts (Railway, etc.) */
export const maxDuration = 120;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB
const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20 MB
const IMAGE_MAX_WIDTH = 1920;
const IMAGE_QUALITY = 88;
const IMAGE_MAX_PIXELS = 1920 * 1920 * 4;

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
      return NextResponse.json({ error: "Missing page or section" }, { status: 400 });
    }
    if (type !== "image" && type !== "video") {
      return NextResponse.json({ error: "type must be image or video" }, { status: 400 });
    }
    if (!file || !file.size) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxBytes = type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error:
            type === "image"
              ? "Image too large. Max 3 MB."
              : "Video too large. Max 20 MB.",
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
    const isHero = section.toLowerCase() === "hero";
    let url: string;
    let key: string;
    let posterUrl: string | null = null;

    if (type === "image") {
      const buf = Buffer.from(await file.arrayBuffer());
      const isDistributorHero = isHero && page.toLowerCase() === "distributor";
      const maxW = isDistributorHero ? 1400 : isHero ? 1600 : IMAGE_MAX_WIDTH;
      const quality = isDistributorHero ? 82 : isHero ? 85 : IMAGE_QUALITY;
      const pipeline = sharp(buf, { limitInputPixels: IMAGE_MAX_PIXELS })
        .resize(maxW, undefined, { withoutEnlargement: true })
        .rotate();
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
          ? await pipeline.png({ compressionLevel: 4 }).toBuffer()
          : outFormat === "webp"
            ? await pipeline.webp({ quality }).toBuffer()
            : await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
      const contentType =
        outFormat === "png" ? "image/png" : outFormat === "webp" ? "image/webp" : "image/jpeg";
      url = await uploadToR2(key, outBuf, contentType, {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      });

      if (isHero) {
        await prisma.pageSection.deleteMany({
          where: { pageName: page, sectionKey: HERO_POSTER_SECTION_KEY },
        });
      }
    } else {
      const originalBuf = Buffer.from(await file.arrayBuffer());
      let uploadBuf = originalBuf;
      let ext = file.name.toLowerCase().endsWith(".webm") ? "webm" : "mp4";
      let contentType: string = ext === "webm" ? "video/webm" : "video/mp4";

      if (isHero) {
        const transcoded = await transcodePageHeroVideoForWeb(originalBuf, file.name);
        if (transcoded && transcoded.length > 0 && transcoded.length <= MAX_VIDEO_BYTES) {
          uploadBuf = Buffer.from(transcoded);
          ext = "mp4";
          contentType = "video/mp4";
        } else if (transcoded && transcoded.length > MAX_VIDEO_BYTES) {
          console.warn(
            "[ADMIN_PAGE_SECTIONS_UPLOAD] Transcoded hero exceeds max size; using original file"
          );
        }
      }

      key = `static/page-media/${page}/${safeSection}_${ts}.${ext}`;
      url = await uploadToR2(key, uploadBuf, contentType, {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      });

      if (isHero) {
        const posterBuf = await extractHeroPosterWebpFromVideo(uploadBuf, `hero.${ext}`);
        if (posterBuf && posterBuf.length > 0) {
          const posterKey = `static/page-media/${page}/${HERO_POSTER_SECTION_KEY}_${ts}.webp`;
          await uploadToR2(posterKey, posterBuf, "image/webp", {
            originalName: `${file.name}-poster.webp`,
            uploadedAt: new Date().toISOString(),
          });
          posterUrl = getPublicUrl(posterKey);
          await prisma.pageSection.upsert({
            where: {
              pageName_sectionKey: { pageName: page, sectionKey: HERO_POSTER_SECTION_KEY },
            },
            create: {
              pageName: page,
              sectionKey: HERO_POSTER_SECTION_KEY,
              mediaType: "IMAGE",
              r2Key: posterKey,
            },
            update: { mediaType: "IMAGE", r2Key: posterKey },
          });
        }
      }
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

    return NextResponse.json({ url, posterUrl, section, mediaType });
  } catch (error) {
    console.error("[ADMIN_PAGE_SECTIONS_UPLOAD]", error);
    return NextResponse.json(
      { error: "Failed to upload. Please try again." },
      { status: 500 }
    );
  }
}
