#!/usr/bin/env ts-node
/**
 * Re-encode all canonical page hero videos to Merchandise CMS standard
 * (15s, H.264 1080p, ~5–6 MB) + WebP posters, then upload to R2.
 *
 * Usage: npm run heroes:sync-merch-standard
 *        npm run heroes:sync-merch-standard -- --dry-run
 *        npm run heroes:sync-merch-standard -- --skip-r2
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { PAGE_HERO_CMS_CONFIG, publicPathToCanonicalR2Key, type PageHeroCmsSlug } from "../src/lib/page-hero-cms-config";
import { transcodePageHeroVideoForWeb, probeHeroVideo } from "../src/lib/transcode-page-hero-video";
import { extractHeroPosterWebpFromVideo } from "../src/lib/extract-hero-poster-from-video";
import { HERO_CMS_VIDEO } from "../src/lib/hero-cms-spec";

const projectRoot = process.cwd();
[".env", ".env.local"].forEach((f) => {
  const p = path.join(projectRoot, f);
  if (fs.existsSync(p)) dotenv.config({ path: p });
});

/** Optional higher-quality source masters (used instead of published path when present). */
const SOURCE_OVERRIDES: Partial<Record<PageHeroCmsSlug, string>> = {
  products: "/videos/hero/Products-SilverKing.source.mp4",
  merchandise: "/videos/hero/VIDEO MERCHANDISE SILVER KING.mp4",
};

/** Dedicated poster paths (replace generic hero-fallback.jpg). */
const POSTER_PATH_OVERRIDES: Partial<Record<PageHeroCmsSlug, string>> = {
  authenticity: "/images/authenticity/authenticity-hero-poster.webp",
  about: "/images/about/about-hero-poster.webp",
  journal: "/images/journal/journal-hero-poster.webp",
};

function decodePublicPath(publicPath: string): string {
  return decodeURIComponent(publicPath.replace(/^\//, ""));
}

function publicAbs(publicPath: string): string {
  return path.join(projectRoot, "public", decodePublicPath(publicPath));
}

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const skipR2 = process.argv.includes("--skip-r2");
  const force = process.argv.includes("--force");

  let uploadToR2: typeof import("../src/lib/r2-client").uploadToR2 | null = null;
  if (!skipR2 && !dryRun) {
    try {
      const r2 = await import("../src/lib/r2-client");
      uploadToR2 = r2.uploadToR2;
    } catch {
      console.warn("R2 client unavailable — local files only.");
    }
  }

  const backupDir = path.join(
    projectRoot,
    "public",
    "videos",
    "hero",
    `backup_merch_standard_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`
  );

  const slugs = (Object.keys(PAGE_HERO_CMS_CONFIG) as PageHeroCmsSlug[]).filter(
    (slug) => PAGE_HERO_CMS_CONFIG[slug].mediaType === "VIDEO" && PAGE_HERO_CMS_CONFIG[slug].videoPath
  );

  console.log("Merchandise hero standard sync");
  console.log(`  publish: ${HERO_CMS_VIDEO.publishDurationSeconds}s, ideal ≤ ${formatMb(HERO_CMS_VIDEO.idealOutputBytes)}, max ${formatMb(HERO_CMS_VIDEO.maxOutputBytes)}\n`);

  if (!dryRun) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`Backups → ${backupDir}\n`);
  }

  const results: { slug: PageHeroCmsSlug; ok: boolean; note: string }[] = [];

  for (const slug of slugs) {
    const cfg = PAGE_HERO_CMS_CONFIG[slug];
    const videoPath = cfg.videoPath!;
    const posterPath = POSTER_PATH_OVERRIDES[slug] ?? cfg.posterPath;
    const sourceOverride = SOURCE_OVERRIDES[slug];
    const inputPublic = sourceOverride ?? videoPath;
    const inputAbs = publicAbs(inputPublic);
    const outputAbs = publicAbs(videoPath);
    const posterAbs = publicAbs(posterPath);

    console.log(`── ${cfg.label} (${slug})`);

    if (!fs.existsSync(inputAbs)) {
      console.warn(`  SKIP: missing ${inputPublic}`);
      results.push({ slug, ok: false, note: "missing source" });
      continue;
    }

    const inputBuf = fs.readFileSync(inputAbs);
    const probe = await probeHeroVideo(inputBuf, path.basename(inputAbs));

    if (
      !force &&
      slug === "merchandise" &&
      inputPublic === videoPath &&
      probe.durationSeconds != null &&
      probe.durationSeconds <= HERO_CMS_VIDEO.publishDurationSeconds + 1 &&
      inputBuf.length <= HERO_CMS_VIDEO.idealOutputBytes * 1.15
    ) {
      console.log(`  SKIP: already Merchandise standard (${formatMb(inputBuf.length)}, ${probe.durationSeconds?.toFixed(1)}s)`);
      results.push({ slug, ok: true, note: "already ok" });
      continue;
    }

    if (dryRun) {
      console.log(`  DRY-RUN: would transcode ${inputPublic} → ${videoPath}`);
      results.push({ slug, ok: true, note: "dry-run" });
      continue;
    }

    const transcoded = await transcodePageHeroVideoForWeb(inputBuf, path.basename(inputAbs));
    if (!transcoded.buffer?.length || transcoded.failure) {
      console.error(`  FAIL: ${transcoded.failure ?? "empty buffer"}`);
      results.push({ slug, ok: false, note: transcoded.failure ?? "transcode failed" });
      continue;
    }

    if (fs.existsSync(outputAbs)) {
      const backupName = `${slug.replace(/[^a-z0-9-]/gi, "_")}_${path.basename(outputAbs)}`;
      fs.copyFileSync(outputAbs, path.join(backupDir, backupName));
    }

    fs.mkdirSync(path.dirname(outputAbs), { recursive: true });
    fs.writeFileSync(outputAbs, transcoded.buffer);

    const posterBuf = await extractHeroPosterWebpFromVideo(transcoded.buffer, path.basename(outputAbs));
    if (posterBuf?.length) {
      fs.mkdirSync(path.dirname(posterAbs), { recursive: true });
      fs.writeFileSync(posterAbs, posterBuf);
    }

    console.log(
      `  OK: ${formatMb(transcoded.buffer.length)}, ${transcoded.outputDurationSeconds?.toFixed(1)}s, CRF ${transcoded.finalCrf}` +
        (transcoded.trimmed ? " (trimmed)" : "") +
        (posterBuf?.length ? `, poster ${formatMb(posterBuf.length)}` : "")
    );

    if (uploadToR2) {
      const videoKey = publicPathToCanonicalR2Key(videoPath);
      await uploadToR2(videoKey, transcoded.buffer, "video/mp4");
      console.log(`  R2 video: ${videoKey}`);
      if (posterBuf?.length) {
        const posterKey = publicPathToCanonicalR2Key(posterPath);
        await uploadToR2(posterKey, posterBuf, "image/webp");
        console.log(`  R2 poster: ${posterKey}`);
      }
    }

    results.push({ slug, ok: true, note: "synced" });
  }

  console.log("\n── Summary");
  for (const r of results) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.slug}: ${r.note}`);
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    process.exit(1);
  }

  console.log("\nBump assetVersion in page-hero-cms-config.ts for updated pages, then deploy.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
