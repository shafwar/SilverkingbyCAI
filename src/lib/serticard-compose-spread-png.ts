import { drawSerticardRootKeyPill } from "@/lib/serticard-draw-rootkey";

export type SerticardSpreadSizeMultipliers = {
  nameMultiplier: number;
  serialMultiplier: number;
};

/**
 * Renders front + back PNG buffers for one Serticard spread (QR + name + serial on front;
 * optional root-key pill on back). Shared by single-PDF and bulk-ZIP routes so layout/fonts stay identical.
 */
export function composeSerticardSpreadPngBuffers(options: {
  canvasMod: {
    createCanvas: (w: number, h: number) => any;
  };
  frontTemplateImage: any;
  backTemplateImage: any;
  qrImage: any;
  productName: string;
  productSerialCode: string;
  sizeMultipliers: SerticardSpreadSizeMultipliers;
  sansFamily: string;
  monoFamily: string;
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
    sansFamily,
    monoFamily,
    templateVariant,
    useCustomTemplate,
    cmsTemplateId,
    rootKeyForBack,
  } = options;

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

  const frontCanvas = canvasMod.createCanvas(frontTemplateImage.width, frontTemplateImage.height);
  const frontCtx = frontCanvas.getContext("2d");
  frontCtx.drawImage(frontTemplateImage, 0, 0);

  const qrSize = Math.min(frontTemplateImage.width * 0.55, frontTemplateImage.height * 0.55, 900);
  const qrX = (frontTemplateImage.width - qrSize) / 2;
  const qrY = frontTemplateImage.height * 0.38;
  const padding = 8;
  frontCtx.fillStyle = "#ffffff";
  frontCtx.fillRect(qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2);
  frontCtx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  const nameOffset = Math.round(frontTemplateImage.height * 0.038);
  const serialOffset = Math.round(frontTemplateImage.height * 0.038);

  let nameFontSize = Math.floor(frontTemplateImage.width * sizeMultipliers.nameMultiplier);
  const nameY = qrY - nameOffset;
  frontCtx.fillStyle = textColor;
  frontCtx.textAlign = "center";
  frontCtx.textBaseline = "bottom";
  const maxNameW = frontTemplateImage.width * 0.9;
  while (nameFontSize > 10) {
    frontCtx.font = `bold ${nameFontSize}px ${sansFamily}`;
    if (frontCtx.measureText(displayProductName).width <= maxNameW) break;
    nameFontSize -= 1;
  }
  frontCtx.fillText(displayProductName, frontTemplateImage.width / 2, nameY);

  const serialFontSize = Math.floor(frontTemplateImage.width * sizeMultipliers.serialMultiplier);
  const serialY = qrY + qrSize + serialOffset;
  frontCtx.fillStyle = textColor;
  frontCtx.textAlign = "center";
  frontCtx.textBaseline = "top";
  frontCtx.font = `bold ${serialFontSize}px ${monoFamily}`;
  frontCtx.fillText(displaySerialCode, frontTemplateImage.width / 2, serialY);

  const frontBuffer = frontCanvas.toBuffer("image/png") as Buffer;

  const backCanvas = canvasMod.createCanvas(backTemplateImage.width, backTemplateImage.height);
  const backCtx = backCanvas.getContext("2d");
  backCtx.drawImage(backTemplateImage, 0, 0);

  const pillKey =
    rootKeyForBack != null && rootKeyForBack.trim().length > 0
      ? rootKeyForBack.trim().toUpperCase()
      : null;
  if (pillKey) {
    drawSerticardRootKeyPill(backCtx, backTemplateImage.width, backTemplateImage.height, pillKey);
  }

  const backBuffer = backCanvas.toBuffer("image/png") as Buffer;

  return { frontBuffer, backBuffer };
}
