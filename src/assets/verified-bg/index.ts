/**
 * Verified-success background images. Imported so Next.js includes them in the build
 * (emitted to .next/static/media/) and they deploy with the app.
 */
import type { StaticImageData } from "next/image";

import merchandiseHero from "../../../public/images/merchandise-hero.png";
import goldIngot from "../../../public/images/gold-ingot.jpg";
import pexels3d from "../../../public/images/pexels-3d-render-1058120333-33539240.jpg";
import pexelsMichael from "../../../public/images/pexels-michael-steinberg-95604-386318.jpg";
import pexelsSejio1 from "../../../public/images/pexels-sejio402-29336321.jpg";
import pexelsSejio2 from "../../../public/images/pexels-sejio402-29336326.jpg";

const images: StaticImageData[] = [
  merchandiseHero,
  goldIngot,
  pexels3d,
  pexelsMichael,
  pexelsSejio1,
  pexelsSejio2,
];

export const VERIFIED_BG_IMAGES: readonly string[] = images.map((img) => img.src);
