import { promises as fs } from "fs";
import path from "path";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  getSerticardVariant,
  isValidSerticardVariant,
  DEFAULT_SERTICARD_VARIANT,
  getLocalTemplateFilename,
  getR2TemplateKey,
} from "@/utils/serticard-templates";
import { getSerticardConfig } from "@/lib/serticard-config";
import { fileExistsInR2 } from "@/lib/r2-client";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});
const BUCKET = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || "silverking-assets";

export type LoadedTemplates = {
  // Loaded via dynamic canvas import at runtime (avoid build-time native binding requirement).
  front: any;
  back: any;
};

async function loadImageFromR2(key: string): Promise<any> {
  const canvasMod = await import("canvas").catch(() => null);
  if (!canvasMod) {
    throw new Error("Canvas module unavailable in this environment");
  }
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const obj = await r2Client.send(command);
  const body = obj.Body;
  if (!body) throw new Error(`Empty object: ${key}`);
  const buffer = Buffer.from(await body.transformToByteArray());
  return canvasMod.loadImage(buffer);
}

/**
 * Load front and back serticard templates.
 * 1. If custom templates are set in SerticardConfig, load those from R2
 * 2. Else load based on variant (01, 03, etc)
 */
export async function loadSerticardTemplates(
  variantId?: string
): Promise<LoadedTemplates> {
  const canvasMod = await import("canvas").catch(() => null);
  if (!canvasMod) {
    throw new Error("Canvas module unavailable in this environment");
  }

  const config = await getSerticardConfig();
  const useCustom =
    config.customFrontR2Key &&
    config.customBackR2Key &&
    (await fileExistsInR2(config.customFrontR2Key)) &&
    (await fileExistsInR2(config.customBackR2Key));

  if (useCustom) {
    const [front, back] = await Promise.all([
      loadImageFromR2(config.customFrontR2Key!),
      loadImageFromR2(config.customBackR2Key!),
    ]);
    return { front, back };
  }

  const vid = variantId && isValidSerticardVariant(variantId) ? variantId : DEFAULT_SERTICARD_VARIANT;
  const variant = getSerticardVariant(vid)!;

  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
  const isLocalDev = process.env.NODE_ENV === "development" || !R2_PUBLIC_URL;

  const frontLocalPath = path.join(
    process.cwd(),
    "public",
    variant.localBase,
    getLocalTemplateFilename(variant.frontNum, variant.ext)
  );
  const backLocalPath = path.join(
    process.cwd(),
    "public",
    variant.localBase,
    getLocalTemplateFilename(variant.backNum, variant.ext)
  );

  let frontTemplateImage: any;
  let backTemplateImage: any;

  if (isLocalDev) {
    await fs.access(frontLocalPath);
    frontTemplateImage = await canvasMod.loadImage(frontLocalPath);
    await fs.access(backLocalPath);
    backTemplateImage = await canvasMod.loadImage(backLocalPath);
    return { front: frontTemplateImage, back: backTemplateImage };
  }

  const base = R2_PUBLIC_URL!.endsWith("/") ? R2_PUBLIC_URL!.slice(0, -1) : R2_PUBLIC_URL!;
  const frontR2Url = `${base}/${getR2TemplateKey(variant.frontNum, variant.ext)}`;
  const backR2Url = `${base}/${getR2TemplateKey(variant.backNum, variant.ext)}`;

  try {
    const frontResponse = await fetch(frontR2Url);
    if (frontResponse.ok) {
      const frontBuffer = Buffer.from(await frontResponse.arrayBuffer());
      frontTemplateImage = await canvasMod.loadImage(frontBuffer);
    } else {
      throw new Error(`R2 front template not found: ${frontResponse.status}`);
    }
  } catch {
    await fs.access(frontLocalPath);
    frontTemplateImage = await canvasMod.loadImage(frontLocalPath);
  }

  try {
    const backResponse = await fetch(backR2Url);
    if (backResponse.ok) {
      const backBuffer = Buffer.from(await backResponse.arrayBuffer());
      backTemplateImage = await canvasMod.loadImage(backBuffer);
    } else {
      throw new Error(`R2 back template not found: ${backResponse.status}`);
    }
  } catch {
    await fs.access(backLocalPath);
    backTemplateImage = await canvasMod.loadImage(backLocalPath);
  }

  return { front: frontTemplateImage, back: backTemplateImage };
}
