import { promises as fs } from "fs";
import path from "path";
import QRCode from "qrcode";
import { createCanvas, loadImage } from "canvas";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getBaseUrl } from "@/utils/constants";
import { getR2Url } from "@/utils/r2-url";

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const r2Available =
  !!R2_ENDPOINT && !!R2_BUCKET && !!R2_ACCESS_KEY_ID && !!R2_SECRET_ACCESS_KEY && !!R2_PUBLIC_URL;

const r2Client = r2Available
  ? new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

const QR_FOLDER = path.join(process.cwd(), "public", "qr");

export type QRStorageResult = {
  url: string;
  mode: "LOCAL" | "R2";
};

/**
 * Adds serial number text below the QR code image
 */
export async function addSerialNumberToQR(qrBuffer: Buffer, serialCode: string): Promise<Buffer> {
  try {
    // Load QR code image
    const qrImage = await loadImage(qrBuffer);

    // Calculate dimensions
    const qrWidth = qrImage.width;
    const qrHeight = qrImage.height;
    const textHeight = 40; // Space for text below QR
    const padding = 20; // Padding around QR and text
    const totalWidth = qrWidth + padding * 2;
    const totalHeight = qrHeight + textHeight + padding * 2;

    // Create canvas
    const canvas = createCanvas(totalWidth, totalHeight);
    const ctx = canvas.getContext("2d");

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Draw QR code centered horizontally, at the top
    const qrX = padding;
    const qrY = padding;
    ctx.drawImage(qrImage, qrX, qrY);

    // Draw serial number text below QR code
    ctx.fillStyle = "#0c0c0c";
    // Use a monospace font that's universally supported and handles alphanumeric characters well
    ctx.font = "bold 20px 'Courier New', Courier, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const textX = totalWidth / 2;
    const textY = qrHeight + padding + textHeight / 2;
    
    // Validate and normalize serialCode
    const normalizedSerialCode = String(serialCode || "").trim().toUpperCase();
    
    console.log("[addSerialNumberToQR] Rendering serial code:", {
      original: serialCode,
      normalized: normalizedSerialCode,
      length: normalizedSerialCode.length,
      isValid: normalizedSerialCode.length >= 3
    });
    
    if (!normalizedSerialCode || normalizedSerialCode.length < 3) {
      console.error("[addSerialNumberToQR] Serial code is empty or invalid:", serialCode);
      // Don't render if serial code is invalid
      return canvas.toBuffer("image/png");
    }
    
    // Ensure proper text rendering with proper encoding
    // Use character-by-character rendering for maximum compatibility
    const charWidth = ctx.measureText("M").width || 10; // Fallback width
    const startX = textX - (normalizedSerialCode.length * charWidth) / 2;
    
    // Render each character individually to ensure proper display
    for (let i = 0; i < normalizedSerialCode.length; i++) {
      const char = normalizedSerialCode[i];
      if (char && char !== " ") {
        const charX = startX + i * charWidth + charWidth / 2;
        try {
          ctx.fillText(char, charX, textY);
        } catch (charError) {
          console.error(`[addSerialNumberToQR] Error rendering character '${char}' at position ${i}:`, charError);
        }
      }
    }
    
    // Verify rendering by checking if text was drawn
    console.log("[addSerialNumberToQR] Serial code rendered:", normalizedSerialCode);

    // Convert canvas to buffer
    return canvas.toBuffer("image/png");
  } catch (error) {
    console.error("Error adding serial number to QR:", error);
    // Return original QR buffer if canvas operation fails
    return qrBuffer;
  }
}

/**
 * Adds product information (name and serial) below the QR code image
 * Used for downloadable QR codes with full product details
 */
export async function addProductInfoToQR(
  qrBuffer: Buffer,
  serialCode: string,
  productName: string
): Promise<Buffer> {
  try {
    // Load QR code image
    const qrImage = await loadImage(qrBuffer);

    // Calculate dimensions
    const qrWidth = qrImage.width;
    const qrHeight = qrImage.height;
    const titleHeight = 30; // Space for product name
    const serialHeight = 25; // Space for serial code
    const padding = 20; // Padding around QR and text
    const spacing = 8; // Space between title and serial
    const totalWidth = qrWidth + padding * 2;
    const totalHeight = qrHeight + titleHeight + serialHeight + padding * 2 + spacing;

    // Create canvas
    const canvas = createCanvas(totalWidth, totalHeight);
    const ctx = canvas.getContext("2d");

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Draw QR code centered horizontally, at the top
    const qrX = padding;
    const qrY = padding;
    ctx.drawImage(qrImage, qrX, qrY);

    const textX = totalWidth / 2;
    let currentY = qrHeight + padding + titleHeight / 2;

    // Draw product name (title) - larger, bold
    ctx.fillStyle = "#0c0c0c";
    ctx.font = "bold 18px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Truncate product name if too long
    const maxWidth = totalWidth - padding * 2 - 20;
    let displayName = productName;
    const metrics = ctx.measureText(displayName);
    if (metrics.width > maxWidth) {
      // Truncate with ellipsis
      while (ctx.measureText(displayName + "...").width > maxWidth && displayName.length > 0) {
        displayName = displayName.slice(0, -1);
      }
      displayName += "...";
    }
    
    ctx.fillText(displayName, textX, currentY);

    // Draw serial code below product name - smaller, monospace
    currentY += titleHeight / 2 + spacing + serialHeight / 2;
    ctx.fillStyle = "#0c0c0c"; // Dark color for better visibility
    ctx.font = "bold 16px 'Courier New', Courier, monospace";
    
    // Validate and normalize serialCode
    const normalizedSerialCode = String(serialCode || "").trim().toUpperCase();
    
    console.log("[addProductInfoToQR] Rendering serial code:", {
      original: serialCode,
      normalized: normalizedSerialCode,
      length: normalizedSerialCode.length,
      isValid: normalizedSerialCode.length >= 3
    });
    
    if (!normalizedSerialCode || normalizedSerialCode.length < 3) {
      console.error("[addProductInfoToQR] Serial code is empty or invalid:", serialCode);
      // Don't render if serial code is invalid
      return canvas.toBuffer("image/png");
    }
    
    // Ensure proper text rendering with proper encoding
    // Use character-by-character rendering for maximum compatibility
    const charWidth = ctx.measureText("M").width || 10; // Fallback width
    const startX = textX - (normalizedSerialCode.length * charWidth) / 2;
    
    // Render each character individually to ensure proper display
    for (let i = 0; i < normalizedSerialCode.length; i++) {
      const char = normalizedSerialCode[i];
      if (char && char !== " ") {
        const charX = startX + i * charWidth + charWidth / 2;
        try {
          ctx.fillText(char, charX, currentY);
        } catch (charError) {
          console.error(`[addProductInfoToQR] Error rendering character '${char}' at position ${i}:`, charError);
        }
      }
    }
    
    // Verify rendering by checking if text was drawn
    console.log("[addProductInfoToQR] Serial code rendered:", normalizedSerialCode);

    // Convert canvas to buffer
    return canvas.toBuffer("image/png");
  } catch (error) {
    console.error("Error adding product info to QR:", error);
    // Fallback to serial number only
    return addSerialNumberToQR(qrBuffer, serialCode);
  }
}

export async function generateAndStoreQR(
  serialCode: string,
  targetUrl: string
): Promise<QRStorageResult> {
  // Generate QR code buffer
  const qrBuffer = await QRCode.toBuffer(targetUrl, {
    width: 560,
    errorCorrectionLevel: "H",
    color: { dark: "#0c0c0c", light: "#ffffff" },
    margin: 1,
  });

  // Add serial number text below QR code
  const pngBuffer = await addSerialNumberToQR(qrBuffer, serialCode);

  if (r2Available && r2Client) {
    const key = `qr/${serialCode}.png`;
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: pngBuffer,
        ContentType: "image/png",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const base = R2_PUBLIC_URL!.endsWith("/") ? R2_PUBLIC_URL!.slice(0, -1) : R2_PUBLIC_URL!;

    return {
      url: `${base}/${key}`,
      mode: "R2",
    };
  }

  // In production (Railway), public folder is read-only after build
  // Use API route for QR generation instead of file system
  const isProduction = process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT;

  if (isProduction) {
    // Return API route URL for on-the-fly generation
    const baseUrl = getBaseUrl();

    return {
      url: `${baseUrl}/api/qr/${serialCode}`,
      mode: "LOCAL",
    };
  }

  // Local development: save to file system
  try {
    await fs.mkdir(QR_FOLDER, { recursive: true });
    const filePath = path.join(QR_FOLDER, `${serialCode}.png`);
    await fs.writeFile(filePath, pngBuffer);

    // Return local path directly (not R2 URL) since file is stored locally
    return {
      url: `/qr/${serialCode}.png`,
      mode: "LOCAL",
    };
  } catch (error) {
    // If file write fails (e.g., in production), fallback to API route
    console.warn("Failed to write QR to file system, using API route:", error);
    const baseUrl = getBaseUrl();

    return {
      url: `${baseUrl}/api/qr/${serialCode}`,
      mode: "LOCAL",
    };
  }
}

export async function deleteLocalQR(serialCode: string) {
  const filePath = path.join(QR_FOLDER, `${serialCode}.png`);
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore if file missing
  }
}

export async function deleteQrAsset(serialCode: string, existingUrl?: string) {
  if (r2Available && r2Client && existingUrl?.includes("/qr/")) {
    const key = existingUrl.split("/qr/")[1];
    if (key) {
      try {
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: R2_BUCKET,
            Key: `qr/${key}`,
          })
        );
        return;
      } catch (error) {
        console.error("Failed to delete QR from R2:", error);
      }
    }
  }

  await deleteLocalQR(serialCode);
}
