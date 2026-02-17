#!/usr/bin/env ts-node
/**
 * Pastikan gambar hero distributor (DSC02998.JPG) ada di R2.
 * Path di R2: static/images/DSC02998.JPG (sesuai getR2Url di frontend).
 *
 * Usage: npx ts-node scripts/ensure-distributor-hero-r2.ts
 *    atau: npm run r2:ensure-hero
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { fileExistsInR2 } from "../src/lib/r2-client";
import { uploadStaticFile } from "../src/lib/r2-static-sync";

dotenv.config({ path: ".env.local" });

const HERO_R2_KEY = "static/images/DSC02998.JPG";
const HERO_LOCAL_PATH = path.join(process.cwd(), "public", "images", "DSC02998.JPG");

async function main() {
  console.log("🖼  Distributor hero image – pastikan ada di R2");
  console.log("   Key yang dipakai frontend:", HERO_R2_KEY);
  console.log("");

  const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error("❌ Env belum lengkap:", missing.join(", "));
    console.error("   Set di .env.local lalu jalankan lagi.");
    process.exit(1);
  }

  const fs = await import("fs");
  if (!fs.existsSync(HERO_LOCAL_PATH)) {
    console.error("❌ File lokal tidak ditemukan:", HERO_LOCAL_PATH);
    process.exit(1);
  }

  try {
    const exists = await fileExistsInR2(HERO_R2_KEY);
    if (exists) {
      console.log("✅ Gambar hero distributor sudah ada di R2:", HERO_R2_KEY);
      const base = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
      if (base) {
        console.log("   URL:", `${base.replace(/\/$/, "")}/${HERO_R2_KEY}`);
      }
      return;
    }

    console.log("📤 Mengupload", HERO_LOCAL_PATH, "ke R2...");
    const result = await uploadStaticFile(HERO_LOCAL_PATH, { overwrite: true });
    console.log("✅ Berhasil. URL:", result.url);
  } catch (e) {
    console.error("❌ Error:", e);
    process.exit(1);
  }
}

main();
