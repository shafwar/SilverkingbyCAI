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
import { prisma } from "@/lib/prisma";

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

export type LoadSerticardTemplatesOptions = {
  /** CMS row id: single spread image in R2, split left = front (QR), right = back */
  cmsTemplateId?: number | null;
  /**
   * When true and both admin custom files exist in R2, load that pair.
   * When false/omitted, use built-in variant (01, 03, …) even if custom files exist — same as pre-regression behavior.
   */
  useCustomTemplate?: boolean;
};

/** Split one horizontal spread into two panels (same pipeline as paired front/back files). */
function splitSpreadToFrontBack(fullImage: any, canvasMod: any): LoadedTemplates {
  const w = fullImage.width as number;
  const h = fullImage.height as number;
  if (w < 8 || h < 8) {
    throw new Error("Serticard template image is too small");
  }
  const leftW = Math.floor(w / 2);
  const rightW = w - leftW;
  const frontCanvas = canvasMod.createCanvas(leftW, h);
  const backCanvas = canvasMod.createCanvas(rightW, h);
  const fctx = frontCanvas.getContext("2d");
  const bctx = backCanvas.getContext("2d");
  fctx.drawImage(fullImage, 0, 0, leftW, h, 0, 0, leftW, h);
  bctx.drawImage(fullImage, leftW, 0, rightW, h, 0, 0, rightW, h);
  return { front: frontCanvas, back: backCanvas };
}

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
 * 1. If options.cmsTemplateId set — CMS spread from R2
 * 2. Else if options.useCustomTemplate === true and admin pair exists in R2 — custom pair
 * 3. Else built-in variant (01, 03, …) from local / R2
 */
export async function loadSerticardTemplates(
  variantId?: string,
  options?: LoadSerticardTemplatesOptions
): Promise<LoadedTemplates> {
  const canvasMod = await import("canvas").catch(() => null);
  if (!canvasMod) {
    throw new Error("Canvas module unavailable in this environment");
  }

  const cmsId = options?.cmsTemplateId;
  if (cmsId != null) {
    const id = Math.floor(Number(cmsId));
    if (Number.isFinite(id) && id > 0) {
      const row = await prisma.serticardUploadedTemplate.findUnique({ where: { id } });
      if (!row) {
        throw new Error(`Serticard CMS template not found (id ${id})`);
      }
      const full = await loadImageFromR2(row.r2Key);
      return splitSpreadToFrontBack(full, canvasMod);
    }
  }

  const wantsCustom = options?.useCustomTemplate === true;
  const config = await getSerticardConfig();
  const customAvailable =
    Boolean(config.customFrontR2Key) &&
    Boolean(config.customBackR2Key) &&
    (await fileExistsInR2(config.customFrontR2Key!)) &&
    (await fileExistsInR2(config.customBackR2Key!));

  if (wantsCustom && customAvailable) {
    const [front, back] = await Promise.all([
      loadImageFromR2(config.customFrontR2Key!),
      loadImageFromR2(config.customBackR2Key!),
    ]);
    return { front, back };
  }

  if (wantsCustom && !customAvailable) {
    console.warn(
      "[Serticard] useCustomTemplate requested but custom front/back missing in R2; falling back to variant:",
      variantId
    );
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
