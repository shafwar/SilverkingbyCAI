#!/usr/bin/env ts-node
/**
 * Upload compressed merchandise hero MP4 + WebP poster to R2 (same keys as getR2UrlClient paths).
 *
 * Prereqs: .env.local with R2_* (same as other upload scripts); files must exist under public/.
 *
 * Usage: pnpm exec ts-node -r dotenv/config --project tsconfig.scripts.json scripts/upload-merchandise-hero-video.ts
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

const projectRoot = process.cwd();
[".env", ".env.local"].forEach((f) => {
  const p = path.join(projectRoot, f);
  if (fs.existsSync(p)) dotenv.config({ path: p });
});

import { uploadToR2 } from "../src/lib/r2-client";

async function main() {
  const videoLocal = path.join(projectRoot, "public", "videos", "hero", "merchandise-hero.mp4");
  const posterLocal = path.join(projectRoot, "public", "images", "merchandise", "merch-hero-poster.webp");

  if (!fs.existsSync(videoLocal)) {
    console.error("Missing:", videoLocal);
    process.exit(1);
  }
  if (!fs.existsSync(posterLocal)) {
    console.warn("Poster missing (optional):", posterLocal);
  }

  console.log("Uploading merchandise hero assets to R2…\n");

  const videoBuf = fs.readFileSync(videoLocal);
  const videoUrl = await uploadToR2("static/videos/hero/merchandise-hero.mp4", videoBuf, "video/mp4");
  console.log("Video:", videoUrl);

  if (fs.existsSync(posterLocal)) {
    const posterBuf = fs.readFileSync(posterLocal);
    const posterUrl = await uploadToR2(
      "static/images/merchandise/merch-hero-poster.webp",
      posterBuf,
      "image/webp"
    );
    console.log("Poster:", posterUrl);
  }

  console.log("\nDone. Production will serve via NEXT_PUBLIC_R2_PUBLIC_URL + /api/hero-video proxy.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
