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

// CRITICAL: Normalize R2_ENDPOINT - remove bucket name from path if present
// R2_ENDPOINT should be just the base URL, bucket is specified separately
const normalizedR2Endpoint = R2_ENDPOINT 
  ? R2_ENDPOINT.replace(/\/[^\/]+$/, "") // Remove last path segment (bucket name)
  : null;

console.log("[QR Config] R2 Configuration:", {
  endpoint: normalizedR2Endpoint ? `${normalizedR2Endpoint.substring(0, 50)}...` : "NOT SET",
  bucket: R2_BUCKET || "NOT SET",
  hasAccessKey: !!R2_ACCESS_KEY_ID,
  hasSecretKey: !!R2_SECRET_ACCESS_KEY,
  publicUrl: R2_PUBLIC_URL || "NOT SET",
  originalEndpoint: R2_ENDPOINT ? `${R2_ENDPOINT.substring(0, 50)}...` : "NOT SET"
});

const r2Available =
  !!normalizedR2Endpoint && !!R2_BUCKET && !!R2_ACCESS_KEY_ID && !!R2_SECRET_ACCESS_KEY && !!R2_PUBLIC_URL;

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
    
    // CRITICAL FIX: Use LARGER font size and multiple rendering techniques for maximum visibility
    // Increase font size significantly for better visibility
    const fontSize = 28; // Increased from 22px to 28px for better visibility
    ctx.fillStyle = "#000000"; // Pure black
    ctx.strokeStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3; // Increased line width for better stroke visibility
    
    // Use larger monospace font - guaranteed to work in all Node.js environments
    ctx.font = `bold ${fontSize}px monospace`;
    
    // Test font rendering by measuring text
    const testMetrics = ctx.measureText(normalizedSerialCode);
    console.log("[addSerialNumberToQR] Font metrics:", {
      width: testMetrics.width,
      font: ctx.font,
      serialCode: normalizedSerialCode
    });
    
    // ALWAYS use character-by-character rendering for maximum reliability
    // This ensures text renders correctly even if font measurement fails
    const charWidth = fontSize * 0.6; // Approximate character width for monospace (60% of font size)
    const totalTextWidth = normalizedSerialCode.length * charWidth;
    const startX = textX - (totalTextWidth / 2);
    
    // Render each character individually with MULTIPLE passes for maximum visibility
    for (let i = 0; i < normalizedSerialCode.length; i++) {
      const char = normalizedSerialCode[i];
      if (char && char.trim()) {
        const charX = startX + (i * charWidth);
        
        // MULTIPLE rendering passes for maximum visibility and reliability
        // 1. White background stroke (outline) for contrast
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.strokeText(char, charX, textY);
        
        // 2. Black stroke (outline) - makes text visible even if fill fails
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeText(char, charX, textY);
        
        // 3. Fill (solid) - main text
        ctx.fillStyle = "#000000";
        ctx.fillText(char, charX, textY);
        
        // 4. Additional fill slightly offset for bold effect
        ctx.fillText(char, charX + 0.5, textY + 0.5);
        ctx.fillText(char, charX - 0.5, textY - 0.5);
      }
    }
    
    console.log("[addSerialNumberToQR] Text rendered character-by-character:", {
      serialCode: normalizedSerialCode,
      characters: normalizedSerialCode.length,
      startX,
      charWidth
    });
    
    // Log successful rendering with detailed information
    console.log("[addSerialNumberToQR] Serial code rendered successfully:", {
      serialCode: normalizedSerialCode,
      font: ctx.font,
      characters: normalizedSerialCode.length,
      centerX: textX,
      textY: textY,
      environment: process.env.NODE_ENV,
      railwayEnv: process.env.RAILWAY_ENVIRONMENT,
      canvasAvailable: typeof createCanvas !== "undefined"
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

    // Draw serial code below product name - LARGER, BOLD, MONOSPACE for maximum visibility
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
    
    // CRITICAL FIX: Use LARGER font size and multiple rendering techniques for maximum visibility
    // Increase font size significantly for better visibility
    const fontSize = 24; // Increased from 18px to 24px for better visibility
    ctx.fillStyle = "#000000"; // Pure black
    ctx.strokeStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3; // Increased line width for better stroke visibility
    
    // Use larger monospace font - guaranteed to work in all Node.js environments
    ctx.font = `bold ${fontSize}px monospace`;
    
    // Test font rendering by measuring text
    const testMetrics = ctx.measureText(normalizedSerialCode);
    console.log("[addProductInfoToQR] Font metrics:", {
      width: testMetrics.width,
      font: ctx.font,
      serialCode: normalizedSerialCode
    });
    
    // ALWAYS use character-by-character rendering for maximum reliability
    // This ensures text renders correctly even if font measurement fails
    const charWidth = fontSize * 0.6; // Approximate character width for monospace (60% of font size)
    const totalTextWidth = normalizedSerialCode.length * charWidth;
    const startX = textX - (totalTextWidth / 2);
    
    // Render each character individually with MULTIPLE passes for maximum visibility
    for (let i = 0; i < normalizedSerialCode.length; i++) {
      const char = normalizedSerialCode[i];
      if (char && char.trim()) {
        const charX = startX + (i * charWidth);
        
        // MULTIPLE rendering passes for maximum visibility and reliability
        // 1. White background stroke (outline) for contrast
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.strokeText(char, charX, currentY);
        
        // 2. Black stroke (outline) - makes text visible even if fill fails
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeText(char, charX, currentY);
        
        // 3. Fill (solid) - main text
        ctx.fillStyle = "#000000";
        ctx.fillText(char, charX, currentY);
        
        // 4. Additional fill slightly offset for bold effect
        ctx.fillText(char, charX + 0.5, currentY + 0.5);
        ctx.fillText(char, charX - 0.5, currentY - 0.5);
      }
    }
    
    console.log("[addProductInfoToQR] Text rendered character-by-character:", {
      serialCode: normalizedSerialCode,
      characters: normalizedSerialCode.length,
      startX,
      charWidth
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
      canvasAvailable: typeof createCanvas !== "undefined"
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
