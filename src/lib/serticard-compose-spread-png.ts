import { drawSerticardRootKeyPill } from "@/lib/serticard-draw-rootkey";
import { normalizeRootKeyForPill } from "@/lib/serticard-rootkey-display";
import {
  ensureSerticardPdfCanvasFontsRegistered,
  SERTICARD_CANVAS_MONO_FAMILY,
  SERTICARD_CANVAS_SANS_FAMILY,
} from "@/lib/serticard-register-canvas-fonts";
import { isSerticardPackagesVariant } from "@/utils/serticard-templates";

export type SerticardSpreadSizeMultipliers = {
  nameMultiplier: number;
  serialMultiplier: number;
};

/** Minimum panel size (px) for PDF/PNG export — improves print & zoom vs low-res templates. */
export const SERTICARD_EXPORT_MIN_PANEL_WIDTH = 1080;
export const SERTICARD_EXPORT_MIN_PANEL_HEIGHT = 1536;
/** Upper bound for QR draw size to avoid excessive memory on huge templates. */
const SERTICARD_QR_MAX_DRAW_PX = 3200;

function computePanelUpscale(naturalW: number, naturalH: number): number {
  if (naturalW < 4 || naturalH < 4) return 1;
  const scaleW = SERTICARD_EXPORT_MIN_PANEL_WIDTH / naturalW;
  const scaleH = SERTICARD_EXPORT_MIN_PANEL_HEIGHT / naturalH;
  return Math.max(1, scaleW, scaleH);
}

/**
 * QR placement for Serticard Packages-01 (reference art 720×1256 px).
 * Front is QR-only (no product name / serial). Slot measured from template white placeholder.
 */
const PACKAGES_LAYOUT_REF = { width: 720, height: 1256 } as const;

/**
 * Inner QR slot in template pixels — white square above baked-in "Scan QR" label.
 * Measured from Packages-01 art (placeholder 138×157 @ 291,94; slot ends above label ~y223).
 */
const PACKAGES_QR_SLOT_PX = {
  left: 291,
  top: 96,
  width: 138,
  height: 127,
} as const;

/** Uniform inset inside the slot (fraction of min side) so QR clears rounded corners. */
const PACKAGES_QR_SLOT_MARGIN_RATIO = 0.018;

function computePackagesQrPlacement(fW: number, fH: number): { qrX: number; qrY: number; qrSize: number } {
  const scaleX = fW / PACKAGES_LAYOUT_REF.width;
  const scaleY = fH / PACKAGES_LAYOUT_REF.height;
  const boxLeft = PACKAGES_QR_SLOT_PX.left * scaleX;
  const boxTop = PACKAGES_QR_SLOT_PX.top * scaleY;
  const boxW = PACKAGES_QR_SLOT_PX.width * scaleX;
  const boxH = PACKAGES_QR_SLOT_PX.height * scaleY;
  const margin = Math.min(boxW, boxH) * PACKAGES_QR_SLOT_MARGIN_RATIO;
  const qrSize = Math.min(
    boxW - margin * 2,
    boxH - margin * 2,
    SERTICARD_QR_MAX_DRAW_PX
  );
  return {
    qrSize,
    qrX: boxLeft + (boxW - qrSize) / 2,
    qrY: boxTop + (boxH - qrSize) / 2,
  };
}

/** Trim QR quiet-zone then draw into the Packages slot for a flush fit in the white tag. */
function drawPackagesQrOnFront(
  canvasMod: { createCanvas: (w: number, h: number) => any },
  frontCtx: CanvasRenderingContext2D,
  qrImage: any,
  placement: { qrX: number; qrY: number; qrSize: number }
): void {
  const renderPx = Math.max(128, Math.ceil(placement.qrSize * 3));
  const scratch = canvasMod.createCanvas(renderPx, renderPx);
  const sctx = scratch.getContext("2d");
  sctx.fillStyle = "#ffffff";
  sctx.fillRect(0, 0, renderPx, renderPx);
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(qrImage, 0, 0, renderPx, renderPx);

  const { data, width, height } = sctx.getImageData(0, 0, renderPx, renderPx);
  let minX = renderPx;
  let minY = renderPx;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (lum < 248) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  frontCtx.imageSmoothingEnabled = true;
  if (maxX > minX && maxY > minY) {
    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const trimmed = canvasMod.createCanvas(cropW, cropH);
    const tctx = trimmed.getContext("2d");
    tctx.drawImage(scratch, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    frontCtx.drawImage(
      trimmed,
      0,
      0,
      cropW,
      cropH,
      placement.qrX,
      placement.qrY,
      placement.qrSize,
      placement.qrSize
    );
    return;
  }

  frontCtx.drawImage(scratch, placement.qrX, placement.qrY, placement.qrSize, placement.qrSize);
}

/**
 * Renders front + back PNG buffers for one Serticard spread (QR + name + serial on front for standard A–I;
 * Packages front is QR-only). Optional root-key pill on back when ZIP bulk requests it.
 *
 * Templates are scaled up (never down) so each panel is at least 1080×1536 px when the source art is smaller,
 * matching print-oriented output while preserving relative layout (same percentages as native size).
 */
export function composeSerticardSpreadPngBuffers(options: {
  canvasMod: {
    createCanvas: (w: number, h: number) => any;
    registerFont?: (path: string, meta: { family: string }) => void;
  };
  frontTemplateImage: any;
  backTemplateImage: any;
  qrImage: any;
  productName: string;
  productSerialCode: string;
  sizeMultipliers: SerticardSpreadSizeMultipliers;
  /** @deprecated Ignored; bundled LucidaSans + SFMono are registered for reliable server rendering. */
  sansFamily?: string;
  /** @deprecated Ignored; see sansFamily. */
  monoFamily?: string;
  templateVariant: string;
  useCustomTemplate: boolean;
  cmsTemplateId: number | null;
  /** Uppercase root key for back pill, or null to skip */
  rootKeyForBack: string | null;
}): { frontBuffer: Buffer; backBuffer: Buffer } {
  const {
    canvasMod,
    frontTemplateImage,
    backTemplateImage,
    qrImage,
    sizeMultipliers,
    templateVariant,
    useCustomTemplate,
    cmsTemplateId,
    rootKeyForBack,
  } = options;

  ensureSerticardPdfCanvasFontsRegistered(canvasMod);
  const sansFamily = SERTICARD_CANVAS_SANS_FAMILY;
  const monoFamily = SERTICARD_CANVAS_MONO_FAMILY;

  const displayProductName =
    options.productName && options.productName.trim().length > 0
      ? options.productName.trim()
      : "PRODUCT";
  const displaySerialCode =
    options.productSerialCode && options.productSerialCode.trim().length > 0
      ? options.productSerialCode.trim().toUpperCase()
      : "UNKNOWN";

  const useCms =
    cmsTemplateId != null && Number.isFinite(cmsTemplateId) && cmsTemplateId > 0;
  const isDarkTemplate = !useCms && (useCustomTemplate || templateVariant !== "01");
  const textColor = isDarkTemplate ? "#ffffff" : "#111111";

  const fw = frontTemplateImage.width as number;
  const fh = frontTemplateImage.height as number;
  const fScale = computePanelUpscale(fw, fh);
  const fW = Math.round(fw * fScale);
  const fH = Math.round(fh * fScale);

  const frontCanvas = canvasMod.createCanvas(fW, fH);
  const frontCtx = frontCanvas.getContext("2d");
  frontCtx.imageSmoothingEnabled = true;
  frontCtx.drawImage(frontTemplateImage, 0, 0, fW, fH);

  const isPackagesLayout = isSerticardPackagesVariant(templateVariant);
  const maxNameW = fW * 0.9;

  let qrSize: number;
  let qrX: number;
  let qrY: number;

  if (isPackagesLayout) {
    const placement = computePackagesQrPlacement(fW, fH);
    qrSize = placement.qrSize;
    qrX = placement.qrX;
    qrY = placement.qrY;
  } else {
    const qrBase = Math.min(fW, fH) * 0.55;
    qrSize = Math.min(qrBase, SERTICARD_QR_MAX_DRAW_PX);
    qrX = (fW - qrSize) / 2;
    qrY = fH * 0.38;
  }

  if (!isPackagesLayout) {
    const padding = Math.max(2, Math.round(8 * fScale));
    frontCtx.fillStyle = "#ffffff";
    frontCtx.fillRect(qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2);
  }

  if (isPackagesLayout) {
    drawPackagesQrOnFront(canvasMod, frontCtx, qrImage, { qrX, qrY, qrSize });
  } else {
    const qrScratch = canvasMod.createCanvas(qrSize, qrSize);
    const qrCtx = qrScratch.getContext("2d");
    qrCtx.imageSmoothingEnabled = true;
    qrCtx.drawImage(qrImage, 0, 0, qrSize, qrSize);
    frontCtx.drawImage(qrScratch, qrX, qrY);
  }

  if (!isPackagesLayout) {
    frontCtx.fillStyle = textColor;
    frontCtx.textAlign = "center";
    const nameOffset = Math.round(fH * 0.038);
    const serialOffset = Math.round(fH * 0.038);

    let nameFontSize = Math.floor(fW * sizeMultipliers.nameMultiplier);
    const nameY = qrY - nameOffset;
    frontCtx.textBaseline = "bottom";
    while (nameFontSize > 10) {
      frontCtx.font = `bold ${nameFontSize}px ${sansFamily}`;
      if (frontCtx.measureText(displayProductName).width <= maxNameW) break;
      nameFontSize -= 1;
    }
    frontCtx.fillText(displayProductName, fW / 2, nameY);

    const serialFontSize = Math.floor(fW * sizeMultipliers.serialMultiplier);
    const serialY = qrY + qrSize + serialOffset;
    frontCtx.textBaseline = "top";
    frontCtx.font = `bold ${serialFontSize}px ${monoFamily}`;
    frontCtx.fillText(displaySerialCode, fW / 2, serialY);
  }

  const frontBuffer = frontCanvas.toBuffer("image/png") as Buffer;

  const bw = backTemplateImage.width as number;
  const bh = backTemplateImage.height as number;
  const bScale = computePanelUpscale(bw, bh);
  const bW = Math.round(bw * bScale);
  const bH = Math.round(bh * bScale);

  const backCanvas = canvasMod.createCanvas(bW, bH);
  const backCtx = backCanvas.getContext("2d");
  backCtx.imageSmoothingEnabled = true;
  backCtx.drawImage(backTemplateImage, 0, 0, bW, bH);

  const pillKey = normalizeRootKeyForPill(rootKeyForBack);
  if (pillKey) {
    drawSerticardRootKeyPill(backCtx, bW, bH, pillKey, monoFamily);
  }

  const backBuffer = backCanvas.toBuffer("image/png") as Buffer;

  return { frontBuffer, backBuffer };
}

/** PDF page size for side-by-side spread — must match upscale used in `composeSerticardSpreadPngBuffers`. */
export function getSerticardPdfPanelSize(
  frontTemplateImage: { width: number; height: number },
  backTemplateImage: { width: number; height: number }
): { panelWidth: number; panelHeight: number } {
  const fw = Number(frontTemplateImage.width) || 1;
  const fh = Number(frontTemplateImage.height) || 1;
  const bw = Number(backTemplateImage.width) || 1;
  const bh = Number(backTemplateImage.height) || 1;
  const fW = Math.round(fw * computePanelUpscale(fw, fh));
  const fH = Math.round(fh * computePanelUpscale(fw, fh));
  const bW = Math.round(bw * computePanelUpscale(bw, bh));
  const bH = Math.round(bh * computePanelUpscale(bw, bh));
  return {
    panelWidth: Math.max(fW, bW),
    panelHeight: Math.max(fH, bH),
  };
}
