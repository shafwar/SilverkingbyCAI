/**
 * Hero video from R2: same-origin proxy via /api/hero-video (supports HTTP Range — required for Safari/iOS MP4).
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
