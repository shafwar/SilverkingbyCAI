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
// We use LucidaSans from /public/fonts for QR rendering.
const QR_FONT_FAMILY = "LucidaSans";
const QR_FONT_PATH = path.join(process.cwd(), "public", "fonts", "LucidaSans.ttf");

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

      // CRITICAL: Normalize R2_PUBLIC_URL to remove bucket name if present
      // R2_PUBLIC_URL should be just the base URL (e.g., https://assets.cahayasilverking.id)
      // NOT include bucket name (e.g., NOT https://assets.cahayasilverking.id/silverking-assets)
      let base = R2_PUBLIC_URL!.endsWith("/") ? R2_PUBLIC_URL!.slice(0, -1) : R2_PUBLIC_URL!;
      
      // Remove bucket name from path if present (e.g., /silverking-assets)
      // This prevents duplicate paths like silverking-assets/silverking-assets/qr/
      const bucketName = R2_BUCKET || "silverking-assets";
      if (base.includes(`/${bucketName}`)) {
        base = base.replace(`/${bucketName}`, "");
        console.log(`[QR] Normalized R2_PUBLIC_URL (removed bucket name): ${base}`);
      }
      
      // CRITICAL: objectKey is already just "qr/{serialCode}.png" (no bucket name)
      // So final URL should be: {base}/qr/{serialCode}.png
      // NOT: {base}/silverking-assets/qr/{serialCode}.png
      const finalUrl = `${base}/${objectKey}`;
      
      console.log(`[QR] R2 URL construction:`, {
        originalR2PublicUrl: R2_PUBLIC_URL,
        normalizedBase: base,
        objectKey,
        finalUrl,
      });

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

/**
 * Upload Serticard templates to R2 (both front and back)
 * Returns URLs for both templates
 */
export async function uploadSerticardTemplates(): Promise<{ frontUrl: string | null; backUrl: string | null }> {
  if (!r2Available || !r2Client) {
    console.warn("[Serticard] R2 not available, skipping template upload");
    return { frontUrl: null, backUrl: null };
  }

  const base = R2_PUBLIC_URL!.endsWith("/") ? R2_PUBLIC_URL!.slice(0, -1) : R2_PUBLIC_URL!;
  let frontUrl: string | null = null;
  let backUrl: string | null = null;

  try {
    // Upload front template (Serticard-01.png)
    const frontTemplatePath = path.join(process.cwd(), "public", "images", "serticard", "Serticard-01.png");
    const frontTemplateBuffer = await fs.readFile(frontTemplatePath);
    const frontObjectKey = "templates/serticard-01.png";
    
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: frontObjectKey,
        Body: frontTemplateBuffer,
        ContentType: "image/png",
        CacheControl: "public, max-age=31536000, immutable", // Cache forever
      })
    );

    frontUrl = `${base}/${frontObjectKey}`;
    console.log("[Serticard] Front template uploaded to R2:", frontUrl);
  } catch (error) {
    console.error("[Serticard] Failed to upload front template to R2:", error);
  }

  try {
    // Upload back template (Serticard-02.png)
    const backTemplatePath = path.join(process.cwd(), "public", "images", "serticard", "Serticard-02.png");
    const backTemplateBuffer = await fs.readFile(backTemplatePath);
    const backObjectKey = "templates/serticard-02.png";
    
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: backObjectKey,
        Body: backTemplateBuffer,
        ContentType: "image/png",
        CacheControl: "public, max-age=31536000, immutable", // Cache forever
      })
    );

    backUrl = `${base}/${backObjectKey}`;
    console.log("[Serticard] Back template uploaded to R2:", backUrl);
  } catch (error) {
    console.error("[Serticard] Failed to upload back template to R2:", error);
  }

  return { frontUrl, backUrl };
}

/**
 * Upload Serticard template to R2 (legacy - for backward compatibility)
 * @deprecated Use uploadSerticardTemplates() instead
 */
export async function uploadSerticardTemplate(): Promise<string | null> {
  const { frontUrl } = await uploadSerticardTemplates();
  return frontUrl;
}

/**
 * Get Serticard template URL from R2 or fallback to local
 * For local development/testing, always use local path
 */
export function getSerticardTemplateUrl(): string {
  // For local development, always use local path
  // In production with R2, check if template exists in R2 first
  const isLocalDev = process.env.NODE_ENV === "development" || !r2Available;
  
  if (isLocalDev) {
    return "/images/serticard/Serticard-01.png";
  }
  
  // Production: try R2 first
  if (r2Available && R2_PUBLIC_URL) {
    const base = R2_PUBLIC_URL.endsWith("/") ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
    return `${base}/templates/serticard-01.png`;
  }
  
  // Final fallback to local path
  return "/images/serticard/Serticard-01.png";
}

/**
 * Generate QR code with Serticard template
 * Places QR code on the Serticard-01.png template
 * Layout optimized for print output
 */
export async function generateQRWithSerticard(
  serialCode: string,
  targetUrl: string,
  productName?: string,
  productWeight?: number
): Promise<Buffer> {
  try {
    // Load template image
    const templatePath = path.join(process.cwd(), "public", "images", "serticard", "Serticard-01.png");
    
    console.log(`[QR Serticard] Attempting to load template from: ${templatePath}`);
    console.log(`[QR Serticard] Current working directory: ${process.cwd()}`);
    
    // Check if template file exists
    try {
      await fs.access(templatePath);
      console.log(`[QR Serticard] Template file found at: ${templatePath}`);
    } catch (accessError: any) {
      const errorMsg = `Template file not found at: ${templatePath}. Please ensure Serticard-01.png exists in public/images/serticard/. Error: ${accessError?.message || accessError}`;
      console.error(`[QR Serticard] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    // Try to load template image
    let templateImage;
    try {
      templateImage = await loadImage(templatePath);
      console.log(`[QR Serticard] Template loaded successfully, dimensions: ${templateImage.width}x${templateImage.height}`);
    } catch (loadError: any) {
      const errorMsg = `Failed to load template image from ${templatePath}. Error: ${loadError?.message || loadError}`;
      console.error(`[QR Serticard] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Generate QR code - larger size for better print quality
    let qrBuffer: Buffer;
    try {
      qrBuffer = await QRCode.toBuffer(targetUrl, {
        width: 800,
        errorCorrectionLevel: "H",
        color: { dark: "#0c0c0c", light: "#ffffff" },
        margin: 2,
      });
      console.log(`[QR Serticard] QR code generated for ${serialCode}, size: ${qrBuffer.length} bytes`);
    } catch (qrError: any) {
      const errorMsg = `Failed to generate QR code for ${serialCode}. Error: ${qrError?.message || qrError}`;
      console.error(`[QR Serticard] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    let qrImage;
    try {
      qrImage = await loadImage(qrBuffer);
      console.log(`[QR Serticard] QR image loaded, dimensions: ${qrImage.width}x${qrImage.height}`);
    } catch (loadError: any) {
      const errorMsg = `Failed to load QR image for ${serialCode}. Error: ${loadError?.message || loadError}`;
      console.error(`[QR Serticard] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Create canvas with template dimensions
    const canvas = createCanvas(templateImage.width, templateImage.height);
    const ctx = canvas.getContext("2d");

    // Draw template as background
    ctx.drawImage(templateImage, 0, 0);

    // Calculate QR code position on template
    // Based on screenshot: QR code is larger and positioned on the left side of serticard
    // QR code should be approximately 45-50% of template width for better visibility
    const qrSize = Math.min(templateImage.width * 0.50, templateImage.height * 0.50, 900);
    // Position QR code on the left side of the template (approximately 25% from left edge)
    const qrX = templateImage.width * 0.25 - qrSize / 2; // Center horizontally on left side
    const qrY = templateImage.height * 0.40; // Position vertically (slightly below center)

    // Draw QR code on template with white background for better visibility
    // Add small white padding around QR for better contrast
    const padding = 10;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2);
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    // Add serial number below QR code using LucidaSans font
    const normalizedSerialCode = String(serialCode || "")
      .trim()
      .toUpperCase();

    if (normalizedSerialCode && normalizedSerialCode.length >= 3) {
      const serialY = qrY + qrSize + 40;
      const fontSize = Math.floor(templateImage.width * 0.035); // Responsive font size
      
      ctx.fillStyle = "#222222";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${fontSize}px "${QR_FONT_FAMILY}"`;
      ctx.fillText(normalizedSerialCode, templateImage.width / 2, serialY);
    }

    // Add product name if provided (above QR code)
    if (productName) {
      const nameY = qrY - 50;
      const fontSize = Math.floor(templateImage.width * 0.028);
      
      ctx.fillStyle = "#222222";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      
      // Truncate if too long
      let displayName = productName;
      const maxWidth = templateImage.width * 0.7;
      const metrics = ctx.measureText(displayName);
      if (metrics.width > maxWidth) {
        while (ctx.measureText(displayName + "...").width > maxWidth && displayName.length > 0) {
          displayName = displayName.slice(0, -1);
        }
        displayName += "...";
      }
      
      ctx.fillText(displayName, templateImage.width / 2, nameY);
    }

    const resultBuffer = canvas.toBuffer("image/png");
    console.log(`[QR Serticard] Successfully generated serticard image for ${serialCode}, size: ${resultBuffer.length} bytes`);
    return resultBuffer;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    const errorStack = error?.stack || "";
    console.error(`[QR Serticard] Error generating QR with Serticard template for ${serialCode}:`, {
      message: errorMsg,
      stack: errorStack,
      serialCode,
      productName,
      productWeight,
      targetUrl,
    });
    // Re-throw with more context
    throw new Error(`Failed to generate QR with Serticard template for ${serialCode}: ${errorMsg}`);
  }
}
