"use client";

import { CmsPageHeroBackground } from "@/components/hero/CmsPageHeroBackground";
import { HOME_HERO_VIGNETTE_BG } from "@/lib/hero-media-defaults";

/**
 * Home hero background — static R2 fallback + optional CMS swap after idle.
 */
export function HomeHeroVideo() {
  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden"
      style={{ transform: "translateZ(0)", WebkitBackfaceVisibility: "hidden" }}
    >
      <CmsPageHeroBackground page="home" />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ backgroundImage: HOME_HERO_VIGNETTE_BG }}
        aria-hidden
      />
    </div>
  );
}
