/**
 * Script to upload ALL Serticard templates to R2 (01-02 + 03-18)
 * Run: npx ts-node --project tsconfig.scripts.json scripts/upload-all-serticard-templates.ts
 *
 * Uploads templates following the pattern:
 * - 01-02: Serticard A (png)
 * - 03-04: Serticard B (jpeg)
 * - 05-06 through 17-18: Serticard C-I (jpeg)
 */

import { promises as fs } from "fs";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Inline config - matches src/utils/serticard-templates.ts (no import to avoid ts-node ESM issues)
const SERTICARD_VARIANTS = [
  { id: "01", label: "Serticard A", frontNum: "01", backNum: "02", ext: "png" as const },
  { id: "03", label: "Serticard B", frontNum: "03", backNum: "04", ext: "jpeg" as const },
  { id: "05", label: "Serticard C", frontNum: "05", backNum: "06", ext: "jpeg" as const },
  { id: "07", label: "Serticard D", frontNum: "07", backNum: "08", ext: "jpeg" as const },
  { id: "09", label: "Serticard E", frontNum: "09", backNum: "10", ext: "jpeg" as const },
  { id: "11", label: "Serticard F", frontNum: "11", backNum: "12", ext: "jpeg" as const },
  { id: "13", label: "Serticard G", frontNum: "13", backNum: "14", ext: "jpeg" as const },
  { id: "15", label: "Serticard H", frontNum: "15", backNum: "16", ext: "jpeg" as const },
  { id: "17", label: "Serticard I", frontNum: "17", backNum: "18", ext: "jpeg" as const },
];

function getLocalTemplateFilename(num: string, ext: "png" | "jpeg"): string {
  const prefix = num === "03" ? "serticard" : "Serticard";
  return `${prefix}-${num}.${ext}`;
}

function getR2TemplateKey(num: string, ext: "png" | "jpeg"): string {
  return `templates/serticard-${num}.${ext}`;
}

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;

const normalizedR2Endpoint = R2_ENDPOINT
  ? R2_ENDPOINT.replace(/\/[^/]+$/, "")
  : R2_ACCOUNT_ID
    ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : null;

const r2Available =
  !!normalizedR2Endpoint &&
  !!R2_BUCKET &&
  !!R2_ACCESS_KEY_ID &&
  !!R2_SECRET_ACCESS_KEY;

const r2Client = r2Available
  ? new S3Client({
      region: "auto",
      endpoint: normalizedR2Endpoint,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

async function uploadTemplatePair(variant: (typeof SERTICARD_VARIANTS)[0]): Promise<boolean> {
  if (!r2Client || !R2_BUCKET) return false;

  const publicDir = path.join(process.cwd(), "public", "images", "serticard");
  const frontPath = path.join(publicDir, getLocalTemplateFilename(variant.frontNum, variant.ext));
  const backPath = path.join(publicDir, getLocalTemplateFilename(variant.backNum, variant.ext));

  const contentType = variant.ext === "png" ? "image/png" : "image/jpeg";

  try {
    await fs.access(frontPath);
  } catch {
    console.warn(`   ⚠️  Skipping ${variant.label}: Front file not found: ${frontPath}`);
    return false;
  }

  try {
    await fs.access(backPath);
  } catch {
    console.warn(`   ⚠️  Skipping ${variant.label}: Back file not found: ${backPath}`);
    return false;
  }

  try {
    const frontBuffer = await fs.readFile(frontPath);
    const backBuffer = await fs.readFile(backPath);

    const frontKey = getR2TemplateKey(variant.frontNum, variant.ext);
    const backKey = getR2TemplateKey(variant.backNum, variant.ext);

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: frontKey,
        Body: frontBuffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: backKey,
        Body: backBuffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    console.log(`   ✅ ${variant.label}: ${frontKey}, ${backKey}`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ ${variant.label}: ${error?.message || error}`);
    return false;
  }
}

async function main() {
  console.log("🚀 Uploading ALL Serticard templates to R2...\n");

  if (!r2Available) {
    console.error("❌ R2 not configured. Set R2_ACCOUNT_ID, R2_BUCKET (or R2_BUCKET_NAME), R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
    process.exit(1);
  }

  console.log("📤 Uploading all template pairs (01-02 through 17-18)...\n");
  let successCount = 0;
  for (const variant of SERTICARD_VARIANTS) {
    const ok = await uploadTemplatePair(variant);
    if (ok) successCount++;
  }

  console.log(`\n✅ Done. Uploaded ${successCount}/${SERTICARD_VARIANTS.length} template pairs.`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
