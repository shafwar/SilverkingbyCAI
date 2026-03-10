#!/usr/bin/env ts-node
/**
 * Compress merchandise JPGs (Polo, T-Shirt & Cap, Knitware) and upload to R2.
 * Uses ffmpeg: q:v 3 (HD, no visible loss), max width 1920.
 *
 * Usage: npm run merchandise:compress-upload
 * Requires: R2_* in .env.local; ffmpeg installed; images in public/images/.
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();
[".env", ".env.local"].forEach((f) => {
  const p = path.join(projectRoot, f);
  if (fs.existsSync(p)) dotenv.config({ path: p });
});

import { uploadToR2 } from "../src/lib/r2-client";

const IMAGES_DIR = path.join(projectRoot, "public", "images");
const OUT_DIR = path.join(projectRoot, "public", "images", ".merchandise-out");

const FILE_GROUPS: { category: string; files: string[] }[] = [
  { category: "polo", files: ["Polo 1.JPG", "Polo 2.JPG", "Polo 3.JPG", "Polo 4.JPG"] },
  {
    category: "tshirt_cap",
    files: [
      "T-Shirt & Cap 1.JPG",
      "T-Shirt & Cap 2.JPG",
      "T-Shirt & Cap 3.JPG",
      "T-Shirt & Cap 4.JPG",
      "T-Shirt & Cap 5.JPG",
      "T-Shirt & Cap 6.JPG",
    ],
  },
  {
    category: "knitware",
    files: [
      "Knitware 1.JPG",
      "Knitware 2.JPG",
      "Knitware 3.JPG",
      "Knitware 4.JPG",
      "Knitware 5.JPG",
    ],
  },
];

// ffmpeg JPEG: q:v 2–5 = very high quality (HD, no visible loss); max width 1920
const FFMPEG_Q = 3;
const MAX_WIDTH = 1920;

async function compressImage(inputPath: string, outputPath: string): Promise<void> {
  // -q:v 3 = high quality JPEG; scale only if larger than 1920
  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-i", inputPath,
      "-vf", `scale=min(${MAX_WIDTH}\\,iw):min(${MAX_WIDTH}\\,ih):force_original_aspect_ratio=decrease`,
      "-q:v", String(FFMPEG_Q),
      outputPath,
    ],
    { maxBuffer: 10 * 1024 * 1024 }
  );
}

async function main() {
  console.log("🖼️  Merchandise: compress (ffmpeg HD) & upload to R2");
  console.log("==========================================\n");

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const bucketName = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME;
  if (!bucketName || !process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    console.error("❌ Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET (or R2_BUCKET_NAME) in .env.local");
    process.exit(1);
  }

  const results: { file: string; category: string; url: string; sizeBefore?: number; sizeAfter: number }[] = [];
  let failed = 0;

  for (const group of FILE_GROUPS) {
    for (let i = 0; i < group.files.length; i++) {
      const fileName = group.files[i];
      const inputPath = path.join(IMAGES_DIR, fileName);

      if (!fs.existsSync(inputPath)) {
        console.warn(`⚠️  Skip (not found): ${fileName}`);
        failed++;
        continue;
      }

      const sizeBefore = fs.statSync(inputPath).size;
      const safeName = fileName.toLowerCase().replace(/\s+/g, "-").replace(/\.jpe?g$/i, "");
      const r2Key = `static/images/merchandise/${group.category}-${i + 1}-${safeName}.jpg`;
      const outPath = path.join(OUT_DIR, `${group.category}-${i + 1}-${safeName}.jpg`);

      try {
        await compressImage(inputPath, outPath);
        const buffer = fs.readFileSync(outPath);
        try { fs.unlinkSync(outPath); } catch { /* ignore */ }
        const url = await uploadToR2(r2Key, buffer, "image/jpeg", {
          originalName: fileName,
          category: group.category,
        });
        results.push({
          file: fileName,
          category: group.category,
          url,
          sizeBefore,
          sizeAfter: buffer.length,
        });
        const saved = sizeBefore > 0 ? ((1 - buffer.length / sizeBefore) * 100).toFixed(1) : "0";
        console.log(`✅ ${fileName} → ${(buffer.length / 1024).toFixed(1)} KB (saved ${saved}%)`);
      } catch (err) {
        console.error(`❌ ${fileName}:`, err);
        failed++;
      }
    }
  }

  console.log("\n==========================================");
  console.log(`Done. Uploaded: ${results.length}, Failed: ${failed}`);
  if (results.length > 0) {
    console.log("\nR2 URLs (use these in CMS or seed DB):");
    results.forEach((r) => console.log(`  ${r.category}: ${r.url}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
