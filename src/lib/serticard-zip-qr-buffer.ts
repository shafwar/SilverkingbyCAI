/**
 * In-process QR PNG for Serticard ZIP builds — mirrors /api/qr/.../qr-only and
 * /api/qr-gram/.../qr-only without HTTP hop per item (major throughput win).
 */
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getVerifyUrl } from "@/utils/constants";

const QR_OPTS = {
  width: 2048,
  errorCorrectionLevel: "H" as const,
  color: { dark: "#0c0c0c", light: "#ffffff" },
  margin: 2,
};

/**
 * @param serialCodeRaw — serial or gram uniqCode (uppercased internally)
 * @param isGram — when true, same lookup path as qr-gram qr-only route
 */
export async function getQrOnlyPngBufferForSerticardZip(
  serialCodeRaw: string,
  isGram: boolean
): Promise<Buffer | null> {
  const serialCode = serialCodeRaw.trim().toUpperCase();
  if (!serialCode || serialCode === "0000" || serialCode.length < 3) return null;

  let codeForVerify: string | null = null;

  if (isGram) {
    const gramItem = await prisma.gramProductItem.findFirst({
      where: { uniqCode: serialCode },
      select: { uniqCode: true },
    });
    if (!gramItem?.uniqCode?.trim()) return null;
    codeForVerify = gramItem.uniqCode.trim();
  } else {
    const product = await prisma.product.findUnique({
      where: { serialCode },
      select: { serialCode: true },
    });
    if (product?.serialCode) {
      codeForVerify = product.serialCode;
    } else {
      const gramItem = await prisma.gramProductItem.findFirst({
        where: { uniqCode: serialCode },
        select: { uniqCode: true },
      });
      if (!gramItem?.uniqCode?.trim()) return null;
      codeForVerify = gramItem.uniqCode.trim();
    }
  }

  const verifyUrl = getVerifyUrl(codeForVerify);
  return QRCode.toBuffer(verifyUrl, QR_OPTS);
}
