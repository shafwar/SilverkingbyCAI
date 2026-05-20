import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getVerifyUrl } from "@/utils/constants";

/** Matches GET /api/qr-gram/.../qr-only and /api/qr/.../qr-only PNG settings. */
const QR_ONLY_OPTIONS = {
  width: 2048,
  errorCorrectionLevel: "H" as const,
  color: { dark: "#0c0c0c", light: "#ffffff" },
  margin: 2,
};

/**
 * QR-only PNG bytes in-process (no same-origin HTTP). Used by multi-PDF ZIP and single PDF
 * so large batches do not depend on NEXTAUTH_URL / self-fetch reliability.
 */
export async function getQrOnlyPngBufferForZip(
  productSerialCode: string,
  isGram: boolean
): Promise<Buffer | null> {
  const code = String(productSerialCode || "").trim().toUpperCase();
  if (!code || code === "0000" || code.length < 3) return null;

  if (isGram) {
    const gramItem = await prisma.gramProductItem.findFirst({
      where: { uniqCode: code },
      select: { uniqCode: true },
    });
    if (!gramItem?.uniqCode?.trim() || gramItem.uniqCode.trim().length < 3) return null;
    const verifyUrl = getVerifyUrl(gramItem.uniqCode);
    return await QRCode.toBuffer(verifyUrl, QR_ONLY_OPTIONS);
  }

  const product = await prisma.product.findUnique({
    where: { serialCode: code },
    select: { serialCode: true },
  });
  let finalSerial = product?.serialCode;
  if (!finalSerial) {
    const gramItem = await prisma.gramProductItem.findFirst({
      where: { uniqCode: code },
      select: { uniqCode: true },
    });
    finalSerial = gramItem?.uniqCode;
  }
  if (!finalSerial || finalSerial.trim().length < 3) return null;
  const verifyUrl = getVerifyUrl(finalSerial);
  return await QRCode.toBuffer(verifyUrl, QR_ONLY_OPTIONS);
}
