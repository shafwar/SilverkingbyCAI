/** Extract R2 object key from public download URL (pathname without leading slash). */
export function r2KeyFromDownloadUrl(downloadUrl: string): string | null {
  try {
    const u = new URL(downloadUrl);
    const key = u.pathname.replace(/^\/+/, "");
    return key || null;
  } catch {
    return null;
  }
}
