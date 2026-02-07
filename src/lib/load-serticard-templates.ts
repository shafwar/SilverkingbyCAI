import { promises as fs } from "fs";
import path from "path";
import { loadImage } from "canvas";
import {
  getSerticardVariant,
  isValidSerticardVariant,
  DEFAULT_SERTICARD_VARIANT,
  getLocalTemplateFilename,
  getR2TemplateKey,
} from "@/utils/serticard-templates";

export type LoadedTemplates = {
  front: Awaited<ReturnType<typeof loadImage>>;
  back: Awaited<ReturnType<typeof loadImage>>;
};

/**
 * Load front and back serticard templates based on variant.
 * Supports R2 (production) and local (development) with fallback.
 */
export async function loadSerticardTemplates(
  variantId?: string
): Promise<LoadedTemplates> {
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

  let frontTemplateImage: Awaited<ReturnType<typeof loadImage>>;
  let backTemplateImage: Awaited<ReturnType<typeof loadImage>>;

  if (isLocalDev) {
    await fs.access(frontLocalPath);
    frontTemplateImage = await loadImage(frontLocalPath);
    await fs.access(backLocalPath);
    backTemplateImage = await loadImage(backLocalPath);
    return { front: frontTemplateImage, back: backTemplateImage };
  }

  const base = R2_PUBLIC_URL!.endsWith("/") ? R2_PUBLIC_URL!.slice(0, -1) : R2_PUBLIC_URL!;
  const frontR2Url = `${base}/${getR2TemplateKey(variant.frontNum, variant.ext)}`;
  const backR2Url = `${base}/${getR2TemplateKey(variant.backNum, variant.ext)}`;

  try {
    const frontResponse = await fetch(frontR2Url);
    if (frontResponse.ok) {
      const frontBuffer = Buffer.from(await frontResponse.arrayBuffer());
      frontTemplateImage = await loadImage(frontBuffer);
    } else {
      throw new Error(`R2 front template not found: ${frontResponse.status}`);
    }
  } catch (r2Error: any) {
    await fs.access(frontLocalPath);
    frontTemplateImage = await loadImage(frontLocalPath);
  }

  try {
    const backResponse = await fetch(backR2Url);
    if (backResponse.ok) {
      const backBuffer = Buffer.from(await backResponse.arrayBuffer());
      backTemplateImage = await loadImage(backBuffer);
    } else {
      throw new Error(`R2 back template not found: ${backResponse.status}`);
    }
  } catch (r2Error: any) {
    await fs.access(backLocalPath);
    backTemplateImage = await loadImage(backLocalPath);
  }

  return { front: frontTemplateImage, back: backTemplateImage };
}
