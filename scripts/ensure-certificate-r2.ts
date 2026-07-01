#!/usr/bin/env ts-node
/**
 * Ensure ISO certificate image exists on R2 (About page).
 * Keys: static/images/sertificate.jpeg, static/images/certificate.jpeg
 *
 * Usage: npx ts-node --project tsconfig.scripts.json scripts/ensure-certificate-r2.ts
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileExistsInR2 } from "../src/lib/r2-client";
import { uploadStaticFile } from "../src/lib/r2-static-sync";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const FILES = ["sertificate.jpeg", "certificate.jpeg"] as const;

async function main() {
  console.log("📜 ISO certificate – ensure R2 objects exist\n");

  const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error("❌ Missing env:", missing.join(", "));
    process.exit(1);
  }

  const base = (process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "").replace(
    /\/$/,
    ""
  );

  for (const filename of FILES) {
    const localPath = path.join(process.cwd(), "public", "images", filename);
    const r2Key = `static/images/${filename}`;

    if (!fs.existsSync(localPath)) {
      console.error("❌ Local file not found:", localPath);
      process.exit(1);
    }

    try {
      const exists = await fileExistsInR2(r2Key);
      if (exists) {
        console.log("✅ Already on R2:", r2Key);
        if (base) console.log("   ", `${base}/${r2Key}`);
        continue;
      }
      console.log("📤 Uploading", filename, "...");
      const result = await uploadStaticFile(localPath, { overwrite: true });
      console.log("✅ Uploaded:", result.url);
    } catch (e) {
      console.error("❌ Failed for", r2Key, e);
      process.exit(1);
    }
  }
}

main();
