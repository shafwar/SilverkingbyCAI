import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize R2 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true, // Required for R2
  maxAttempts: 3, // Retry up to 3 times for failed requests
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "silverking-assets";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

/**
 * Upload file to R2
 * @param key - Object key (path) in the bucket
 * @param body - File buffer or stream
 * @param contentType - MIME type of the file
 * @param metadata - Optional metadata
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
  metadata?: Record<string, string>
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
    });

    await r2Client.send(command);

    // Return public URL
    const publicUrl = PUBLIC_URL
      ? `${PUBLIC_URL}/${key}`
      : `https://${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;

    return publicUrl;
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error(
      `Failed to upload file to R2: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Delete file from R2
 * @param key - Object key (path) in the bucket
 */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error("Error deleting from R2:", error);
    throw new Error(
      `Failed to delete file from R2: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Check if file exists in R2
 * @param key - Object key (path) in the bucket
 * @returns true if file exists, false otherwise
 */
export async function fileExistsInR2(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Get signed URL for private file access (expires in 1 hour by default)
 * @param key - Object key (path) in the bucket
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL
 */
export async function getSignedUrlFromR2(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw new Error(
      `Failed to generate signed URL: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * List objects in R2 bucket
 * @param prefix - Optional prefix to filter objects
 * @param maxKeys - Maximum number of keys to return (default: 1000)
 * @returns Array of object keys
 */
export async function listObjectsInR2(prefix?: string, maxKeys: number = 1000): Promise<string[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const response = await r2Client.send(command);
    return response.Contents?.map((obj) => obj.Key || "") || [];
  } catch (error) {
    console.error("Error listing objects from R2:", error);
    throw new Error(
      `Failed to list objects from R2: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get public URL for a file in R2
 * @param key - Object key (path) in the bucket
 * @returns Public URL
 */
export function getPublicUrl(key: string): string {
  if (PUBLIC_URL) {
    return `${PUBLIC_URL}/${key}`;
  }
  // Fallback to R2.dev subdomain if PUBLIC_URL is not set
  return `https://${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;
}

/**
 * Upload file from FormData or File
 * @param file - File object from FormData
 * @param path - Destination path in R2 (e.g., "images/product.jpg")
 * @returns Public URL of the uploaded file
 */
export async function uploadFileToR2(file: File, path: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return uploadToR2(path, buffer, file.type, {
    originalName: file.name,
    uploadedAt: new Date().toISOString(),
  });
}
