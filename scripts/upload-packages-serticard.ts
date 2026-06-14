/**
 * Upload Serticard Packages templates only to R2.
 * Run: npx ts-node --project tsconfig.scripts.json scripts/upload-packages-serticard.ts
 */
import { existsSync } from "fs";
import { promises as fs } from "fs";
import path from "path";
import * as dotenv from "dotenv";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

[".env", ".env.local"].forEach((f) => {
  const p = path.join(process.cwd(), f);
  if (existsSync(p)) dotenv.config({ path: p });
});

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

async function main() {
  if (!normalizedR2Endpoint || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error("❌ R2 not configured");
    process.exit(1);
  }

  const client = new S3Client({
    region: "auto",
    endpoint: normalizedR2Endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  const dir = path.join(process.cwd(), "public", "images", "serticard");
  const pairs = [
    {
      key: "templates/serticard-packages-01.jpeg",
      file: path.join(dir, "Serticard Packages-01.jpeg"),
    },
    {
      key: "templates/serticard-packages-02.jpeg",
      file: path.join(dir, "Serticard Packages-02.jpeg"),
    },
  ];

  for (const { key, file } of pairs) {
    const body = await fs.readFile(file);
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: "image/jpeg",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    console.log(`✅ Uploaded ${key}`);
  }

  console.log("\n✅ Serticard Packages templates uploaded to R2.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
