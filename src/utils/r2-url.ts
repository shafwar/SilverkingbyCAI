/**
 * Utility function to convert local public asset paths to R2 bucket URLs
 * 
 * Converts paths like:
 * - /images/logo.png -> ${R2_PUBLIC_URL}/static/images/logo.png
 * - /videos/hero/video.mp4 -> ${R2_PUBLIC_URL}/static/videos/hero/video.mp4
 * - /qr/SKC000001.png -> ${R2_PUBLIC_URL}/static/qr/SKC000001.png
 * 
 * Falls back to local path if R2 is not configured
 */

/**
 * Get R2 URL for a static asset
 * @param localPath - Local public path (e.g., "/images/logo.png" or "images/logo.png")
 * @returns R2 URL if configured, otherwise returns local path
 */
export function getR2Url(localPath: string): string {
  // Get R2 public URL from environment
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;
  
  // If R2 is not configured, return local path
  if (!r2PublicUrl) {
    // Ensure path starts with /
    return localPath.startsWith('/') ? localPath : `/${localPath}`;
  }
  
  // Remove leading slash if present
  const cleanPath = localPath.startsWith('/') ? localPath.slice(1) : localPath;
  
  // Construct R2 URL with static/ prefix
  const r2Path = `static/${cleanPath}`;
  
  // Ensure R2_PUBLIC_URL doesn't end with /
  const baseUrl = r2PublicUrl.replace(/\/$/, '');
  
  return `${baseUrl}/${r2Path}`;
}

/**
 * Get R2 URL for a static asset (client-side safe)
 * This version can be used in client components
 * @param localPath - Local public path (e.g., "/images/logo.png")
 * @returns R2 URL if configured, otherwise returns local path
 */
export function getR2UrlClient(localPath: string): string {
  // On client side, we can only use NEXT_PUBLIC_ prefixed env vars
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  
  // If R2 is not configured, return local path
  if (!r2PublicUrl) {
    return localPath.startsWith('/') ? localPath : `/${localPath}`;
  }
  
  // Remove leading slash if present
  const cleanPath = localPath.startsWith('/') ? localPath.slice(1) : localPath;
  
  // Construct R2 URL with static/ prefix
  const r2Path = `static/${cleanPath}`;
  
  // Ensure R2_PUBLIC_URL doesn't end with /
  const baseUrl = r2PublicUrl.replace(/\/$/, '');
  
  return `${baseUrl}/${r2Path}`;
}

