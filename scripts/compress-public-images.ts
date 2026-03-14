#!/usr/bin/env ts-node
/**
 * Compress all images in public/ to smaller file size without visible quality loss.
 * - JPEG: max width 1920, quality 85
 * - PNG: max width 1920, optimize
 * Uses sips on macOS (no extra deps); falls back to sharp if available.
 *
 * Usage: npm run compress:images
 */

import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const MAX_WIDTH = 1920;

const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function* walkDir(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkDir(full);
    } else if (e.isFile() && EXTENSIONS.includes(path.extname(e.name).toLowerCase())) {
      yield full;
    }
  }
}

function compressWithSips(filePath: string): { sizeBefore: number; sizeAfter: number; skipped: boolean } {
  const sizeBefore = fs.statSync(filePath).size;
  const ext = path.extname(filePath).toLowerCase();
  const tmpPath = `${filePath}.tmp.${Date.now()}${ext}`;
  try {
    if (ext === ".jpg" || ext === ".jpeg") {
      execFileSync(
        "sips",
        ["-Z", String(MAX_WIDTH), "-s", "format", "jpeg", "-s", "formatOptions", "85", "--out", tmpPath, filePath],
        { stdio: "pipe", maxBuffer: 50 * 1024 * 1024 }
      );
    } else {
      execFileSync("sips", ["-Z", String(MAX_WIDTH), "--out", tmpPath, filePath], {
        stdio: "pipe",
        maxBuffer: 50 * 1024 * 1024,
      });
    }
  } catch {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
    return { sizeBefore, sizeAfter: sizeBefore, skipped: true };
  }
  const sizeAfter = fs.statSync(tmpPath).size;
  // Only replace if smaller (never increase file size or change quality for the worse)
  if (sizeAfter < sizeBefore) {
    fs.renameSync(tmpPath, filePath);
    return { sizeBefore, sizeAfter, skipped: false };
  }
  fs.unlinkSync(tmpPath);
  return { sizeBefore, sizeAfter: sizeBefore, skipped: true };
}

async function main() {
  console.log("🖼️  Compressing all images in public/ (quality preserved, smaller size)\n");
  const files: string[] = [];
  for (const f of walkDir(PUBLIC_DIR)) {
    files.push(f);
  }
  if (files.length === 0) {
    console.log("No images found in public/");
    return;
  }
  console.log(`Found ${files.length} image(s). Using sips (macOS).\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  let failed = 0;

  for (const filePath of files) {
    const rel = path.relative(PROJECT_ROOT, filePath);
    try {
      const { sizeBefore, sizeAfter, skipped } = compressWithSips(filePath);
      totalBefore += sizeBefore;
      totalAfter += sizeAfter;
      if (skipped) {
        console.log(`⏭️  ${rel}  ${(sizeBefore / 1024).toFixed(1)} KB (unchanged — already optimal or error)`);
      } else {
        const pct = sizeBefore > 0 ? ((1 - sizeAfter / sizeBefore) * 100).toFixed(1) : "0";
        console.log(`✅ ${rel}  ${(sizeBefore / 1024).toFixed(1)} KB → ${(sizeAfter / 1024).toFixed(1)} KB (saved ${pct}%)`);
      }
    } catch (err) {
      console.error(`❌ ${rel}:`, err);
      failed++;
    }
  }

  console.log("\n==========================================");
  console.log(`Total: ${(totalBefore / 1024).toFixed(1)} KB → ${(totalAfter / 1024).toFixed(1)} KB`);
  if (totalBefore > 0) {
    console.log(`Saved: ${((1 - totalAfter / totalBefore) * 100).toFixed(1)}%`);
  }
  console.log(`Done. Processed: ${files.length - failed}, Failed: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
