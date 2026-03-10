/**
 * Verified-success background image paths (public URL paths).
 * Only paths that exist under public/images/ — avoids 404 and black fallback.
 * No static imports; served from public/ at runtime.
 */
export const VERIFIED_BG_IMAGES: readonly string[] = [
  "/images/merchandise-hero.png",
  "/images/hero-fallback.jpg",
];
