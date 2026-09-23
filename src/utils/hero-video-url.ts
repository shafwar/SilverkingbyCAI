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

/** If URL is on R2/static, return url as-is to utilize Cloudflare CDN directly and avoid egress costs. */
export function proxiedHeroVideoSrc(url: string): string {
  // Option B: Serve files via Cloudflare CDN (R2_PUBLIC_URL), NOT direct proxy via /api/hero-video
  // By returning the URL directly, we allow the browser to hit the Edge CDN
  // which saves egress and avoids the Next.js API bottleneck.
  return url;
}
