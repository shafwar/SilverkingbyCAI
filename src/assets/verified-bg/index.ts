/**
 * Verified-success background image paths (public path form).
 * Verify page resolves these via getR2UrlClient() → R2 in production (static/images/...).
 * Ensure these files exist in R2 (e.g. sync public/ via r2-static-sync or manual upload).
 */
export const VERIFIED_BG_IMAGES: readonly string[] = [
  "/images/merchandise-hero.png",
  "/images/hero-fallback.jpg",
];
