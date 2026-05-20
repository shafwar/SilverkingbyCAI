import { drawSerticardRootKeyPill } from "@/lib/serticard-draw-rootkey";
import { normalizeRootKeyForPill } from "@/lib/serticard-rootkey-display";
import {
  ensureSerticardPdfCanvasFontsRegistered,
  SERTICARD_CANVAS_MONO_FAMILY,
  SERTICARD_CANVAS_SANS_FAMILY,
} from "@/lib/serticard-register-canvas-fonts";

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
 * Renders front + back PNG buffers for one Serticard spread (QR + name + serial on front;
 * optional root-key pill on back). Shared by single-PDF and bulk-ZIP routes so layout/fonts stay identical.
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

  const qrBase = Math.min(fW, fH) * 0.55;
  const qrSize = Math.min(qrBase, SERTICARD_QR_MAX_DRAW_PX);
  const qrX = (fW - qrSize) / 2;
  const qrY = fH * 0.38;
  const padding = Math.max(2, Math.round(8 * fScale));
  frontCtx.fillStyle = "#ffffff";
  frontCtx.fillRect(qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2);

  const qrScratch = canvasMod.createCanvas(qrSize, qrSize);
  const qrCtx = qrScratch.getContext("2d");
  qrCtx.imageSmoothingEnabled = true;
  qrCtx.drawImage(qrImage, 0, 0, qrSize, qrSize);
  frontCtx.drawImage(qrScratch, qrX, qrY);

  const nameOffset = Math.round(fH * 0.038);
  const serialOffset = Math.round(fH * 0.038);

  let nameFontSize = Math.floor(fW * sizeMultipliers.nameMultiplier);
  const nameY = qrY - nameOffset;
  frontCtx.fillStyle = textColor;
  frontCtx.textAlign = "center";
  frontCtx.textBaseline = "bottom";
  const maxNameW = fW * 0.9;
  while (nameFontSize > 10) {
    frontCtx.font = `bold ${nameFontSize}px ${sansFamily}`;
    if (frontCtx.measureText(displayProductName).width <= maxNameW) break;
    nameFontSize -= 1;
  }
  frontCtx.fillText(displayProductName, fW / 2, nameY);

  const serialFontSize = Math.floor(fW * sizeMultipliers.serialMultiplier);
  const serialY = qrY + qrSize + serialOffset;
  frontCtx.fillStyle = textColor;
  frontCtx.textAlign = "center";
  frontCtx.textBaseline = "top";
  frontCtx.font = `bold ${serialFontSize}px ${monoFamily}`;
  frontCtx.fillText(displaySerialCode, fW / 2, serialY);

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
