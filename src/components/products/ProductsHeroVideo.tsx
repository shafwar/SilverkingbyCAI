"use client";

import { forwardRef } from "react";
import { CmsPageHeroBackground } from "@/components/hero/CmsPageHeroBackground";

/** Frame subject lower so centered copy sits over background, not face/product. */
const PRODUCTS_HERO_OBJECT_POSITION = "center 30%";

/**
 * Products page hero — CMS-aware; forwards ref for GSAP scroll fades.
 */
export const ProductsHeroVideo = forwardRef<HTMLVideoElement>(function ProductsHeroVideo(
  _props,
  ref
) {
  return (
    <CmsPageHeroBackground
      ref={ref}
      page="products"
      containerClassName="absolute inset-0 w-screen h-screen z-10"
      objectPosition={PRODUCTS_HERO_OBJECT_POSITION}
    />
  );
});
