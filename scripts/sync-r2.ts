#!/usr/bin/env ts-node
/**
 * Script to sync static assets from /public to Cloudflare R2
 *
 * Usage:
 *   npm run r2:sync              # Sync all files (skip if exists)
 *   npm run r2:sync -- --force   # Force overwrite all files
 *   npm run r2:sync -- --folders images,videos # Sync specific folders only
 */

import * as dotenv from "dotenv";
import { syncPublicToR2, uploadPublicFolders } from "../src/lib/r2-static-sync";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Workaround for Windows SSL handshake failure
// Set NODE_TLS_REJECT_UNAUTHORIZED=0 to bypass SSL verification (testing only)
const skipSslVerify = process.argv.includes("--skip-ssl-verify");
if (skipSslVerify) {
  // Set environment variable before any imports that might use it
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  // Also set for Node.js https module
  if (typeof process.env.NODE_TLS_REJECT_UNAUTHORIZED === "undefined") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
  console.warn("⚠️  WARNING: SSL verification is disabled (for testing only!)");
}

interface SyncResult {
  file: string;
  url: string;
  skipped: boolean;
  error?: string;
}

interface SyncSummary {
  total: number;
  uploaded: number;
  skipped: number;
  failed: number;
  results: SyncResult[];
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const foldersArg = args.find((arg) => arg.startsWith("--folders"));
  const folders = foldersArg ? foldersArg.split("=")[1]?.split(",") || [] : [];

  console.log("🚀 Cloudflare R2 Static Assets Sync");
  console.log("=====================================\n");

  // Validate environment variables
  const requiredEnvVars = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    console.error("\nPlease check your .env.local file.");
    process.exit(1);
  }

  console.log(`📦 Bucket: ${process.env.R2_BUCKET_NAME}`);
  console.log(`🌐 Public URL: ${process.env.R2_PUBLIC_URL || "Not set"}`);
  console.log(`🔄 Mode: ${force ? "Force overwrite" : "Skip existing"}\n`);

  try {
    let summary: SyncSummary;

    if (folders.length > 0) {
      // Sync specific folders
      console.log(`📁 Syncing folders: ${folders.join(", ")}\n`);
      summary = await uploadPublicFolders(folders, {
        skipIfExists: !force,
        overwrite: force,
        onProgress: (current: number, total: number, file: string) => {
          process.stdout.write(`\r[${current}/${total}] ${file}${" ".repeat(50)}`);
        },
      });
    } else {
      // Sync entire public directory
      console.log("📁 Syncing entire public directory...\n");
      summary = await syncPublicToR2({
        skipIfExists: !force,
        overwrite: force,
        onProgress: (current: number, total: number, file: string) => {
          process.stdout.write(`\r[${current}/${total}] ${file}${" ".repeat(50)}`);
        },
      });
    }

    console.log("\n\n📊 Summary:");
    console.log(`   ✅ Uploaded: ${summary.uploaded}`);
    console.log(`   ⏭️  Skipped: ${summary.skipped}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   📦 Total: ${summary.total}`);

    if (summary.failed > 0) {
      console.log("\n❌ Failed files:");
      summary.results
        .filter((r) => r.error)
        .forEach((r) => {
          console.log(`   - ${r.file}: ${r.error}`);
        });
    }

    console.log("\n✨ Done!");
  } catch (error) {
    console.error("\n❌ Error during sync:", error);
    process.exit(1);
  }
}

main();
