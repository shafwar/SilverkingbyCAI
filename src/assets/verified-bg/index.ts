/**
 * Verified-success background posters — lightweight WebP only (~15–72 KB each).
 * Reuses Merchandise-standard hero posters (ambient, no product text overlay).
 * Same R2 paths as other static assets; dark gradient overlay on verify page keeps text readable.
 */
export const VERIFIED_BG_IMAGES: readonly string[] = [
  "/images/home/home-hero-poster.webp",
  "/images/merchandise/merch-hero-poster.webp",
  "/images/what-we-do/what-we-do-hero-poster.webp",
  "/images/about/about-hero-poster.webp",
  "/images/authenticity/authenticity-hero-poster.webp",
  "/images/products/products-hero-poster.webp",
  "/images/journal/journal-hero-poster.webp",
];

/** Total static pool size — matches verified-bg-images API cap. */
export const VERIFIED_BG_MAX_IMAGES = VERIFIED_BG_IMAGES.length;
