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
    
    // Validate and normalize serialCode first - CRITICAL: Ensure we have a valid serial code
    const normalizedSerialCode = String(serialCode || "").trim().toUpperCase();
    
    console.log("[addSerialNumberToQR] Rendering serial code:", {
      original: serialCode,
      normalized: normalizedSerialCode,
      length: normalizedSerialCode.length,
      isValid: normalizedSerialCode.length >= 3,
      type: typeof serialCode,
      value: JSON.stringify(serialCode)
    });
    
    if (!normalizedSerialCode || normalizedSerialCode.length < 3) {
      console.error("[addSerialNumberToQR] Serial code is empty or invalid:", {
        serialCode,
        normalized: normalizedSerialCode,
        length: normalizedSerialCode.length
      });
      // Don't render if serial code is invalid - return QR without text
      return canvas.toBuffer("image/png");
    }
    
    // Additional validation: ensure serial code doesn't contain only zeros or invalid characters
    if (normalizedSerialCode.match(/^0+$/)) {
      console.error("[addSerialNumberToQR] Serial code contains only zeros - this is invalid:", normalizedSerialCode);
      return canvas.toBuffer("image/png");
    }
    
    const textX = totalWidth / 2;
    const textY = qrHeight + padding + textHeight / 2;
    
    // CRITICAL FIX: Use robust text rendering with guaranteed font fallback
    // Render text using the most reliable method possible
    ctx.fillStyle = "#000000"; // Pure black
    ctx.strokeStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1.5;
    
    // Use the most basic, guaranteed-to-work font first
    // Start with simple monospace which should always work
    ctx.font = "bold 22px monospace";
    
    // Verify font works by measuring
    const testMetrics = ctx.measureText(normalizedSerialCode);
    const hasValidWidth = testMetrics.width > 0;
    
    console.log("[addSerialNumberToQR] Font test:", {
      serialCode: normalizedSerialCode,
      measuredWidth: testMetrics.width,
      hasValidWidth,
      font: ctx.font
    });
    
    if (hasValidWidth) {
      // Render text multiple times for visibility and reliability
      // First with stroke (outline) for better visibility
      ctx.strokeText(normalizedSerialCode, textX, textY);
      // Then with fill (solid) for the main text
      ctx.fillText(normalizedSerialCode, textX, textY);
      // Render again slightly offset for bold effect
      ctx.fillText(normalizedSerialCode, textX + 0.5, textY + 0.5);
      
      console.log("[addSerialNumberToQR] Text rendered successfully with monospace font");
    } else {
      // Fallback: character-by-character rendering with fixed width
      console.warn("[addSerialNumberToQR] Font measurement failed, using character-by-character fallback");
      
      ctx.textAlign = "left";
      ctx.font = "bold 22px monospace";
      
      // Use fixed character width for monospace (approximately 13.2px for 22px font)
      const charWidth = 13.2;
      const totalTextWidth = normalizedSerialCode.length * charWidth;
      const startX = textX - (totalTextWidth / 2);
      
      // Render each character individually with stroke and fill
      for (let i = 0; i < normalizedSerialCode.length; i++) {
        const char = normalizedSerialCode[i];
        if (char) {
          const charX = startX + (i * charWidth);
          
          // Render with stroke first, then fill
          ctx.strokeText(char, charX, textY);
          ctx.fillText(char, charX, textY);
        }
      }
      
      console.log("[addSerialNumberToQR] Text rendered character-by-character");
    }
    
    // Log successful rendering
    console.log("[addSerialNumberToQR] Serial code rendered successfully:", {
      serialCode: normalizedSerialCode,
      font: ctx.font,
      characters: normalizedSerialCode.length,
      centerX: textX,
      textY: textY
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
    
    // Validate and normalize serialCode - CRITICAL: Ensure we have a valid serial code
    const normalizedSerialCode = String(serialCode || "").trim().toUpperCase();
    
    console.log("[addProductInfoToQR] Rendering serial code:", {
      original: serialCode,
      normalized: normalizedSerialCode,
      length: normalizedSerialCode.length,
      isValid: normalizedSerialCode.length >= 3,
      type: typeof serialCode,
      value: JSON.stringify(serialCode)
    });
    
    if (!normalizedSerialCode || normalizedSerialCode.length < 3) {
      console.error("[addProductInfoToQR] Serial code is empty or invalid:", {
        serialCode,
        normalized: normalizedSerialCode,
        length: normalizedSerialCode.length
      });
      // Don't render if serial code is invalid - return QR without text
      return canvas.toBuffer("image/png");
    }
    
    // Additional validation: ensure serial code doesn't contain only zeros or invalid characters
    if (normalizedSerialCode.match(/^0+$/)) {
      console.error("[addProductInfoToQR] Serial code contains only zeros - this is invalid:", normalizedSerialCode);
      return canvas.toBuffer("image/png");
    }
    
    // CRITICAL FIX: Use robust text rendering with guaranteed font fallback
    // Render text using the most reliable method possible
    ctx.fillStyle = "#000000"; // Pure black
    ctx.strokeStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1.5;
    
    // Use the most basic, guaranteed-to-work font first
    // Start with simple monospace which should always work
    ctx.font = "bold 18px monospace";
    
    // Verify font works by measuring
    const testMetrics = ctx.measureText(normalizedSerialCode);
    const hasValidWidth = testMetrics.width > 0;
    
    console.log("[addProductInfoToQR] Font test:", {
      serialCode: normalizedSerialCode,
      measuredWidth: testMetrics.width,
      hasValidWidth,
      font: ctx.font
    });
    
    if (hasValidWidth) {
      // Render text multiple times for visibility and reliability
      // First with stroke (outline) for better visibility
      ctx.strokeText(normalizedSerialCode, textX, currentY);
      // Then with fill (solid) for the main text
      ctx.fillText(normalizedSerialCode, textX, currentY);
      // Render again slightly offset for bold effect
      ctx.fillText(normalizedSerialCode, textX + 0.5, currentY + 0.5);
      
      console.log("[addProductInfoToQR] Text rendered successfully with monospace font");
    } else {
      // Fallback: character-by-character rendering with fixed width
      console.warn("[addProductInfoToQR] Font measurement failed, using character-by-character fallback");
      
      ctx.textAlign = "left";
      ctx.font = "bold 18px monospace";
      
      // Use fixed character width for monospace (approximately 10.8px for 18px font)
      const charWidth = 10.8;
      const totalTextWidth = normalizedSerialCode.length * charWidth;
      const startX = textX - (totalTextWidth / 2);
      
      // Render each character individually with stroke and fill
      for (let i = 0; i < normalizedSerialCode.length; i++) {
        const char = normalizedSerialCode[i];
        if (char) {
          const charX = startX + (i * charWidth);
          
          // Render with stroke first, then fill
          ctx.strokeText(char, charX, currentY);
          ctx.fillText(char, charX, currentY);
        }
      }
      
      console.log("[addProductInfoToQR] Text rendered character-by-character");
    }
    
    // Log successful rendering
    console.log("[addProductInfoToQR] Serial code rendered successfully:", {
      serialCode: normalizedSerialCode,
      font: ctx.font,
      characters: normalizedSerialCode.length,
      centerX: textX,
      textY: currentY
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
        // CRITICAL: Use shorter cache for QR codes to allow updates
        // QR codes are sensitive and may need updates without regeneration
        CacheControl: "public, max-age=3600, must-revalidate",
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
