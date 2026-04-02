/**
 * Hero video from R2: same-origin proxy for Range requests / consistent playback.
 * Used by Journal (and can be reused by other pages that stream via /api/hero-video).
 */

export function r2KeyFromPublicUrl(url: string): string | null {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";
  if (base && url.startsWith(base)) {
    return url.slice(base.length + 1);
  }
  const idx = url.indexOf("/static/");
  return idx >= 0 ? url.slice(idx + 1) : null;
}

/** If URL is on R2/static, return proxied path; otherwise return url as-is (e.g. local /videos/...). */
export function proxiedHeroVideoSrc(url: string): string {
  const key = r2KeyFromPublicUrl(url);
  if (key) {
    return `/api/hero-video?key=${encodeURIComponent(key)}`;
  }
  return url;
}
