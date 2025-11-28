import { promises as fs } from "fs";
import path from "path";
import QRCode from "qrcode";
import { createCanvas, loadImage, registerFont } from "canvas";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
// Use relative path for compatibility with seed script and Next.js
import { getBaseUrl } from "../utils/constants";
import { getR2Url } from "../utils/r2-url";

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME; // Support both variable names
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// CRITICAL: Normalize R2_ENDPOINT - remove bucket name from path if present
// R2_ENDPOINT should be just the base URL, bucket is specified separately
// If R2_ENDPOINT is not set, construct it from R2_ACCOUNT_ID
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const normalizedR2Endpoint = R2_ENDPOINT
  ? R2_ENDPOINT.replace(/\/[^\/]+$/, "") // Remove last path segment (bucket name)
  : R2_ACCOUNT_ID
    ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : null;

console.log("[QR Config] R2 Configuration:", {
  endpoint: normalizedR2Endpoint ? `${normalizedR2Endpoint.substring(0, 50)}...` : "NOT SET",
  bucket: R2_BUCKET || "NOT SET",
  hasAccessKey: !!R2_ACCESS_KEY_ID,
  hasSecretKey: !!R2_SECRET_ACCESS_KEY,
  publicUrl: R2_PUBLIC_URL || "NOT SET",
  originalEndpoint: R2_ENDPOINT ? `${R2_ENDPOINT.substring(0, 50)}...` : "NOT SET",
});

const r2Available =
  !!normalizedR2Endpoint &&
  !!R2_BUCKET &&
  !!R2_ACCESS_KEY_ID &&
  !!R2_SECRET_ACCESS_KEY &&
  !!R2_PUBLIC_URL;

const r2Client = r2Available
  ? new S3Client({
      region: "auto",
      endpoint: normalizedR2Endpoint,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

const QR_FOLDER = path.join(process.cwd(), "public", "qr");

// Register bundled font for QR labels so text renders consistently in all environments
// We use SF Mono Regular from /public/fonts and expose it as "SKMono" family for QR rendering.
const QR_FONT_FAMILY = "SKMono";
const QR_FONT_PATH = path.join(process.cwd(), "public", "fonts", "SFMono-Regular.otf");

try {
  registerFont(QR_FONT_PATH, { family: QR_FONT_FAMILY });
  console.log("[QR Config] Registered QR font:", {
    family: QR_FONT_FAMILY,
    path: QR_FONT_PATH,
  });
} catch (error) {
  console.warn("[QR Config] Failed to register QR font, falling back to system fonts:", {
    error,
    path: QR_FONT_PATH,
  });
}

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
    // Extra space below QR so larger serial text has room when printed small
    const textHeight = 70;
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

    // Validate and normalize serialCode first - CRITICAL: Ensure we have a valid serial code
    const normalizedSerialCode = String(serialCode || "")
      .trim()
      .toUpperCase();

    console.log("[addSerialNumberToQR] Rendering serial code:", {
      original: serialCode,
      normalized: normalizedSerialCode,
      length: normalizedSerialCode.length,
      isValid: normalizedSerialCode.length >= 3,
      type: typeof serialCode,
      value: JSON.stringify(serialCode),
    });

    if (!normalizedSerialCode || normalizedSerialCode.length < 3) {
      console.error("[addSerialNumberToQR] Serial code is empty or invalid:", {
        serialCode,
        normalized: normalizedSerialCode,
        length: normalizedSerialCode.length,
      });
      // Don't render if serial code is invalid - return QR without text
      return canvas.toBuffer("image/png");
    }

    // Additional validation: ensure serial code doesn't contain only zeros or invalid characters
    if (normalizedSerialCode.match(/^0+$/)) {
      console.error(
        "[addSerialNumberToQR] Serial code contains only zeros - this is invalid:",
        normalizedSerialCode
      );
      return canvas.toBuffer("image/png");
    }

    const textX = totalWidth / 2;
    const textY = qrHeight + padding + textHeight / 2;

    // Serial label under QR (optimized for small-print readability & balance)
    const fontSize = 30;
    ctx.fillStyle = "#222222"; // slightly darker for print
    ctx.strokeStyle = "transparent";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1;
    ctx.font = `${fontSize}px "${QR_FONT_FAMILY}"`;

    // Simple centered rendering – monospaced font keeps spacing clean
    ctx.fillText(normalizedSerialCode, textX, textY);

    console.log("[addSerialNumberToQR] Final text rendering status:", {
      serialCode: normalizedSerialCode,
      position: { x: textX, y: textY },
      canvasSize: { width: canvas.width, height: canvas.height },
    });

    ctx.restore();

    // Log successful rendering with detailed information
    console.log("[addSerialNumberToQR] Serial code rendered successfully:", {
      serialCode: normalizedSerialCode,
      font: ctx.font,
      characters: normalizedSerialCode.length,
      centerX: textX,
      textY: textY,
      environment: process.env.NODE_ENV,
      railwayEnv: process.env.RAILWAY_ENVIRONMENT,
      canvasAvailable: typeof createCanvas !== "undefined",
    });

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
    // More vertical room so larger name + serial do not collide
    const titleHeight = 42;
    const serialHeight = 40;
    const padding = 20; // Padding around QR and text
    const spacing = 18; // Space between product name and serial
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

    // Draw product name (title)
    ctx.fillStyle = "#0c0c0c";
    ctx.font = "bold 22px Arial, sans-serif";
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

    // Draw serial code below product name - LARGER, BOLD, MONOSPACE for maximum visibility
    currentY += titleHeight / 2 + spacing + serialHeight / 2;

    // Validate and normalize serialCode - CRITICAL: Ensure we have a valid serial code
    const normalizedSerialCode = String(serialCode || "")
      .trim()
      .toUpperCase();

    console.log("[addProductInfoToQR] Rendering serial code:", {
      original: serialCode,
      normalized: normalizedSerialCode,
      length: normalizedSerialCode.length,
      isValid: normalizedSerialCode.length >= 3,
      type: typeof serialCode,
      value: JSON.stringify(serialCode),
    });

    if (!normalizedSerialCode || normalizedSerialCode.length < 3) {
      console.error("[addProductInfoToQR] Serial code is empty or invalid:", {
        serialCode,
        normalized: normalizedSerialCode,
        length: normalizedSerialCode.length,
      });
      // Don't render if serial code is invalid - return QR without text
      return canvas.toBuffer("image/png");
    }

    // Additional validation: ensure serial code doesn't contain only zeros or invalid characters
    if (normalizedSerialCode.match(/^0+$/)) {
      console.error(
        "[addProductInfoToQR] Serial code contains only zeros - this is invalid:",
        normalizedSerialCode
      );
      return canvas.toBuffer("image/png");
    }

    // Serial label in download version (product name + serial)
    const fontSize = 24;
    ctx.fillStyle = "#222222";
    ctx.strokeStyle = "transparent";
    ctx.textAlign = "center"; // center on textX
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.font = `${fontSize}px "${QR_FONT_FAMILY}"`;

    // Simple centered rendering using bundled font
    ctx.save();
    ctx.fillText(normalizedSerialCode, textX, currentY);

    console.log("[addProductInfoToQR] Final text rendering status:", {
      serialCode: normalizedSerialCode,
      position: { x: textX, y: currentY },
      canvasSize: { width: canvas.width, height: canvas.height },
    });

    ctx.restore();

    console.log("[addProductInfoToQR] Text rendered character-by-character:", {
      serialCode: normalizedSerialCode,
      characters: normalizedSerialCode.length,
    });

    // Log successful rendering with detailed information
    console.log("[addProductInfoToQR] Serial code rendered successfully:", {
      serialCode: normalizedSerialCode,
      font: ctx.font,
      characters: normalizedSerialCode.length,
      centerX: textX,
      textY: currentY,
      environment: process.env.NODE_ENV,
      railwayEnv: process.env.RAILWAY_ENVIRONMENT,
      canvasAvailable: typeof createCanvas !== "undefined",
    });

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
  targetUrl: string,
  productName?: string
): Promise<QRStorageResult> {
  console.log(">>> [generateAndStoreQR] Starting QR generation for serial:", serialCode, {
    productName,
  });

  // STEP 1: Generate raw QR code buffer
  const qrBuffer = await QRCode.toBuffer(targetUrl, {
    width: 600,
    errorCorrectionLevel: "H",
    color: { dark: "#0c0c0c", light: "#ffffff" },
    margin: 2,
  });

  console.log(">>> [generateAndStoreQR] QR buffer generated, size:", qrBuffer.length);

  // STEP 2: Add product info (name + serial) using shared renderer to guarantee consistency
  const labelName = productName?.trim() || serialCode;
  const pngBuffer = await addProductInfoToQR(qrBuffer, serialCode, labelName);

  console.log(">>> [generateAndStoreQR] Final QR (with label) size:", pngBuffer.length, {
    hasProductName: !!productName,
    labelName,
  });

  // STEP 3: Upload FINAL PNG (with QR + text) to R2
  if (r2Available && r2Client) {
    const objectKey = `qr/${serialCode}.png`;

    console.log(">>> Uploading to R2:", {
      bucket: R2_BUCKET,
      key: objectKey,
      bufferSize: pngBuffer.length,
      serialCode,
    });

    try {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: objectKey,
          Body: pngBuffer, // This is the FINAL PNG with QR + text
          ContentType: "image/png",
          // CRITICAL: Use shorter cache for QR codes to allow updates
          CacheControl: "public, max-age=3600, must-revalidate",
        })
      );

      const base = R2_PUBLIC_URL!.endsWith("/") ? R2_PUBLIC_URL!.slice(0, -1) : R2_PUBLIC_URL!;
      const finalUrl = `${base}/${objectKey}`;

      console.log(">>> R2 Upload successful:", finalUrl);
      console.log(">>> Object key includes serial:", objectKey.includes(serialCode));

      return {
        url: finalUrl,
        mode: "R2",
      };
    } catch (error) {
      console.error(">>> R2 Upload failed:", error);
      throw error;
    }
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
