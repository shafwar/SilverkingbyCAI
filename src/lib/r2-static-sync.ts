import * as fs from "fs";
import * as path from "path";
import { uploadToR2, fileExistsInR2, getPublicUrl } from "./r2-client";

const PUBLIC_DIR = path.join(process.cwd(), "public");

/**
 * Get MIME type based on file extension
 */
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    // Images
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    // Videos
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
    ".mov": "video/quicktime",
    // Documents
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".json": "application/json",
    // Other
    ".xml": "application/xml",
    ".css": "text/css",
    ".js": "application/javascript",
    ".html": "text/html",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Get relative path from public directory (removes 'public/' prefix)
 */
function getRelativePath(filePath: string): string {
  const relativePath = path.relative(PUBLIC_DIR, filePath);
  // Normalize path separators for R2 (use forward slashes)
  return relativePath.replace(/\\/g, "/");
}

/**
 * Upload a single file from public directory to R2
 * @param filePath - Absolute path to the file
 * @param options - Upload options
 * @returns Public URL of uploaded file
 */
export async function uploadStaticFile(
  filePath: string,
  options: {
    skipIfExists?: boolean;
    overwrite?: boolean;
  } = {}
): Promise<{ url: string; skipped: boolean }> {
  const { skipIfExists = false, overwrite = false } = options;

  // Get relative path for R2 key
  const r2Key = getRelativePath(filePath);

  // Check if file exists in R2
  if (skipIfExists && !overwrite) {
    const exists = await fileExistsInR2(r2Key);
    if (exists) {
      return { url: getPublicUrl(r2Key), skipped: true };
    }
  }

  // Read file
  const fileBuffer = fs.readFileSync(filePath);
  const contentType = getContentType(filePath);

  // Upload to R2 with retry logic for SSL issues
  let url: string;
  let retries = 3;
  let lastError: Error | null = null;

  while (retries > 0) {
    try {
      url = await uploadToR2(r2Key, fileBuffer, contentType, {
        originalPath: filePath,
        uploadedAt: new Date().toISOString(),
      });
      return { url, skipped: false };
    } catch (error: any) {
      lastError = error;
      // If SSL error, wait a bit before retry
      if (error.message?.includes("SSL") || error.message?.includes("handshake")) {
        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
          continue;
        }
      } else {
        // For non-SSL errors, don't retry
        throw error;
      }
    }
  }

  // If all retries failed, throw the last error
  throw lastError || new Error("Failed to upload after retries");
}

/**
 * Upload all files from a directory recursively
 * @param dirPath - Directory path (relative to public or absolute)
 * @param options - Upload options
 * @returns Array of upload results
 */
export async function uploadDirectory(
  dirPath: string,
  options: {
    skipIfExists?: boolean;
    overwrite?: boolean;
    onProgress?: (current: number, total: number, file: string) => void;
  } = {}
): Promise<Array<{ file: string; url: string; skipped: boolean; error?: string }>> {
  const { skipIfExists = false, overwrite = false, onProgress } = options;

  // Resolve directory path
  const absoluteDir = path.isAbsolute(dirPath) ? dirPath : path.join(PUBLIC_DIR, dirPath);

  if (!fs.existsSync(absoluteDir)) {
    throw new Error(`Directory not found: ${absoluteDir}`);
  }

  // Collect all files recursively
  const files: string[] = [];
  function collectFiles(currentPath: string) {
    const items = fs.readdirSync(currentPath);
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        collectFiles(itemPath);
      } else if (stat.isFile()) {
        files.push(itemPath);
      }
    }
  }

  collectFiles(absoluteDir);

  // Upload files
  const results: Array<{
    file: string;
    url: string;
    skipped: boolean;
    error?: string;
  }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      if (onProgress) {
        onProgress(i + 1, files.length, getRelativePath(file));
      }

      const result = await uploadStaticFile(file, { skipIfExists, overwrite });
      results.push({
        file: getRelativePath(file),
        url: result.url,
        skipped: result.skipped,
      });
    } catch (error) {
      results.push({
        file: getRelativePath(file),
        url: "",
        skipped: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Sync entire public directory to R2
 * @param options - Sync options
 * @returns Summary of sync operation
 */
export async function syncPublicToR2(
  options: {
    skipIfExists?: boolean;
    overwrite?: boolean;
    onProgress?: (current: number, total: number, file: string) => void;
  } = {}
): Promise<{
  total: number;
  uploaded: number;
  skipped: number;
  failed: number;
  results: Array<{ file: string; url: string; skipped: boolean; error?: string }>;
}> {
  console.log("🔄 Starting sync of public directory to R2...");

  const results = await uploadDirectory("", {
    ...options,
    onProgress: (current, total, file) => {
      if (options.onProgress) {
        options.onProgress(current, total, file);
      } else {
        console.log(`[${current}/${total}] Uploading: ${file}`);
      }
    },
  });

  const summary = {
    total: results.length,
    uploaded: results.filter((r) => !r.skipped && !r.error).length,
    skipped: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => r.error).length,
    results,
  };

  console.log("✅ Sync completed!");
  console.log(`   Total: ${summary.total}`);
  console.log(`   Uploaded: ${summary.uploaded}`);
  console.log(`   Skipped: ${summary.skipped}`);
  console.log(`   Failed: ${summary.failed}`);

  return summary;
}

/**
 * Upload specific folders from public directory
 * @param folders - Array of folder names (e.g., ['images', 'videos/hero'])
 * @param options - Upload options
 * @returns Summary of upload operation
 */
export async function uploadPublicFolders(
  folders: string[],
  options: {
    skipIfExists?: boolean;
    overwrite?: boolean;
    onProgress?: (current: number, total: number, file: string) => void;
  } = {}
): Promise<{
  total: number;
  uploaded: number;
  skipped: number;
  failed: number;
  results: Array<{ file: string; url: string; skipped: boolean; error?: string }>;
}> {
  const allResults: Array<{
    file: string;
    url: string;
    skipped: boolean;
    error?: string;
  }> = [];

  for (const folder of folders) {
    console.log(`📁 Uploading folder: ${folder}`);
    const folderResults = await uploadDirectory(folder, {
      ...options,
      onProgress: (current, total, file) => {
        if (options.onProgress) {
          options.onProgress(current, total, file);
        }
      },
    });
    allResults.push(...folderResults);
  }

  const summary = {
    total: allResults.length,
    uploaded: allResults.filter((r) => !r.skipped && !r.error).length,
    skipped: allResults.filter((r) => r.skipped).length,
    failed: allResults.filter((r) => r.error).length,
    results: allResults,
  };

  return summary;
}

/**
 * Upload a single file by relative path from public directory
 * @param relativePath - Path relative to public (e.g., 'images/logo.png')
 * @param options - Upload options
 * @returns Public URL of uploaded file
 */
export async function uploadPublicFile(
  relativePath: string,
  options: {
    skipIfExists?: boolean;
    overwrite?: boolean;
  } = {}
): Promise<{ url: string; skipped: boolean }> {
  const absolutePath = path.join(PUBLIC_DIR, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  return uploadStaticFile(absolutePath, options);
}

/**
 * Get list of all files in public directory
 * @returns Array of relative file paths
 */
export function listPublicFiles(): string[] {
  const files: string[] = [];

  function collectFiles(currentPath: string, basePath: string) {
    const items = fs.readdirSync(currentPath);
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        collectFiles(itemPath, basePath);
      } else if (stat.isFile()) {
        const relativePath = path.relative(basePath, itemPath);
        files.push(relativePath.replace(/\\/g, "/"));
      }
    }
  }

  collectFiles(PUBLIC_DIR, PUBLIC_DIR);
  return files;
}
