/**
 * Verified-success background image paths (public URL paths).
 * No static imports — build never resolves these; they are served from public/ at runtime.
 * .dockerignore includes these files so they are in the deploy context.
 */
export const VERIFIED_BG_IMAGES: readonly string[] = [
  "/images/merchandise-hero.png",
  "/images/gold-ingot.jpg",
  "/images/pexels-3d-render-1058120333-33539240.jpg",
  "/images/pexels-michael-steinberg-95604-386318.jpg",
  "/images/pexels-sejio402-29336321.jpg",
  "/images/pexels-sejio402-29336326.jpg",
];
