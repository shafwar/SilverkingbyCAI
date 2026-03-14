#!/usr/bin/env ts-node
/**
 * Compress all videos in public/videos/ to smaller file size without visible quality loss.
 * Uses ffmpeg: H.264, CRF 23, max height 1080, faststart.
 * Only replaces file when output is smaller.
 *
 * Usage: npm run compress:videos
 * Requires: ffmpeg installed
 */

import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PUBLIC_VIDEOS = path.join(PROJECT_ROOT, "public", "videos");
const MAX_HEIGHT = 1080;
const CRF = 23;

function* walkVideos(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith("backup")) continue;
      yield* walkVideos(full);
    } else if (e.isFile() && /\.(mp4|webm|mov)$/i.test(e.name)) {
      yield full;
    }
  }
}

function compressVideo(filePath: string): { sizeBefore: number; sizeAfter: number; skipped: boolean } {
  const sizeBefore = fs.statSync(filePath).size;
  const ext = path.extname(filePath).toLowerCase();
  const tmpPath = `${filePath}.tmp.${Date.now()}${ext}`;
  try {
    // H.264, CRF 23 (visually lossless), scale to max 1080p, faststart for web
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        filePath,
        "-c:v",
        "libx264",
        "-crf",
        String(CRF),
        "-preset",
        "medium",
        "-vf",
        `scale='min(iw,1920)':'min(ih,${MAX_HEIGHT})'`,
        "-movflags",
        "+faststart",
        "-an", // strip audio for hero backgrounds (no sound)
        tmpPath,
      ],
      { stdio: "pipe", maxBuffer: 100 * 1024 * 1024 }
    );
  } catch (err) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
    return { sizeBefore, sizeAfter: sizeBefore, skipped: true };
  }
  if (!fs.existsSync(tmpPath)) {
    return { sizeBefore, sizeAfter: sizeBefore, skipped: true };
  }
  const sizeAfter = fs.statSync(tmpPath).size;
  if (sizeAfter < sizeBefore) {
    fs.renameSync(tmpPath, filePath);
    return { sizeBefore, sizeAfter, skipped: false };
  }
  fs.unlinkSync(tmpPath);
  return { sizeBefore, sizeAfter: sizeBefore, skipped: true };
}

async function main() {
  console.log("🎬 Compressing all videos in public/videos/ (quality preserved)\n");
  const files: string[] = [];
  for (const f of walkVideos(PUBLIC_VIDEOS)) {
    files.push(f);
  }
  if (files.length === 0) {
    console.log("No videos found in public/videos/");
    return;
  }
  console.log(`Found ${files.length} video(s). Using ffmpeg (H.264 CRF ${CRF}, max height ${MAX_HEIGHT}p).\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  let failed = 0;

  for (const filePath of files) {
    const rel = path.relative(PROJECT_ROOT, filePath);
    try {
      const { sizeBefore, sizeAfter, skipped } = compressVideo(filePath);
      totalBefore += sizeBefore;
      totalAfter += sizeAfter;
      if (skipped) {
        console.log(`⏭️  ${rel}  ${(sizeBefore / 1024 / 1024).toFixed(2)} MB (unchanged)`);
      } else {
        const pct = sizeBefore > 0 ? ((1 - sizeAfter / sizeBefore) * 100).toFixed(1) : "0";
        console.log(
          `✅ ${rel}  ${(sizeBefore / 1024 / 1024).toFixed(2)} MB → ${(sizeAfter / 1024 / 1024).toFixed(2)} MB (saved ${pct}%)`
        );
      }
    } catch (err) {
      console.error(`❌ ${rel}:`, err);
      failed++;
    }
  }

  console.log("\n==========================================");
  console.log(
    `Total: ${(totalBefore / 1024 / 1024).toFixed(2)} MB → ${(totalAfter / 1024 / 1024).toFixed(2)} MB`
  );
  if (totalBefore > 0) {
    console.log(`Saved: ${((1 - totalAfter / totalBefore) * 100).toFixed(1)}%`);
  }
  console.log(`Done. Processed: ${files.length - failed}, Failed: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
