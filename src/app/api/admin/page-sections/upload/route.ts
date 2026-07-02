/**
 * Admin API: upload section media. File stored in R2, key saved in PageSection.
 * Images: HD WebP compression for CMS / hero usage.
 * Hero video: duration-validated, trimmed for web hero usage, then H.264 1080p transcode + WebP poster.
 * POST formData: page, section, type (image|video), file
 */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToR2, getPublicUrl } from "@/lib/r2-client";
import {
  probeHeroVideo,
  transcodePageHeroVideoForWeb,
} from "@/lib/transcode-page-hero-video";
import { extractHeroPosterWebpFromVideo } from "@/lib/extract-hero-poster-from-video";
import { HERO_POSTER_SECTION_KEY } from "@/lib/page-hero-cms-config";

/** Allow hero ffmpeg pass on slow hosts (Railway, etc.) */
export const maxDuration = 300;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25 MB input
const MAX_IMAGE_OUTPUT_BYTES = 8 * 1024 * 1024; // keep HD, avoid overly tiny output
const MAX_VIDEO_DURATION_SECONDS = 60;
const MAX_VIDEO_OUTPUT_BYTES = 30 * 1024 * 1024;
const IMAGE_MAX_WIDTH = 2400;
const IMAGE_QUALITY = 90;
const IMAGE_MAX_PIXELS = 5000 * 5000;

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

    if (type === "image" && file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        {
          error: "Image too large. Max 25 MB.",
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
      const maxW = isDistributorHero ? 2200 : isHero ? IMAGE_MAX_WIDTH : 2000;
      const quality = isDistributorHero ? 92 : isHero ? 90 : IMAGE_QUALITY;
      const pipeline = sharp(buf, { limitInputPixels: IMAGE_MAX_PIXELS })
        .resize(maxW, undefined, { withoutEnlargement: true })
        .rotate();
      key = `static/page-media/${page}/${safeSection}_${ts}.webp`;
      const contentType = "image/webp";
      let outBuf = await pipeline
        .clone()
        .webp({ quality, alphaQuality: quality, effort: 5 })
        .toBuffer();
      if (outBuf.length > MAX_IMAGE_OUTPUT_BYTES) {
        outBuf = await pipeline
          .clone()
          .webp({ quality: Math.max(84, quality - 4), alphaQuality: Math.max(84, quality - 4), effort: 5 })
          .toBuffer();
      }
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
      const videoProbe = await probeHeroVideo(originalBuf, file.name);

      if (
        videoProbe.durationSeconds != null &&
        videoProbe.durationSeconds > MAX_VIDEO_DURATION_SECONDS
      ) {
        return NextResponse.json(
          { error: "Video terlalu panjang. Maksimal 1 menit." },
          { status: 400 }
        );
      }

      let uploadBuf = originalBuf;
      let ext = file.name.toLowerCase().endsWith(".webm") ? "webm" : "mp4";
      let contentType: string = ext === "webm" ? "video/webm" : "video/mp4";

      if (isHero) {
        const transcoded = await transcodePageHeroVideoForWeb(originalBuf, file.name);
        if (transcoded.buffer && transcoded.buffer.length > 0) {
          if (transcoded.buffer.length > MAX_VIDEO_OUTPUT_BYTES) {
            return NextResponse.json(
              {
                error:
                  "Video terlalu berat setelah optimasi. Gunakan klip yang lebih sederhana atau resolusi sumber yang lebih ringan.",
              },
              { status: 400 }
            );
          }
          uploadBuf = Buffer.from(transcoded.buffer);
          ext = "mp4";
          contentType = "video/mp4";
        } else {
          return NextResponse.json(
            { error: "Video gagal dioptimasi. Coba file MP4/WebM lain." },
            { status: 400 }
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
