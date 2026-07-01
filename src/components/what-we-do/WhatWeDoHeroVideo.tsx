"use client";

import { CmsPageHeroBackground } from "@/components/hero/CmsPageHeroBackground";

/**
 * What We Do hero background — static R2 fallback + optional CMS swap after idle.
 */
export function WhatWeDoHeroVideo() {
  return (
    <CmsPageHeroBackground
      page="what-we-do"
      containerClassName="absolute inset-0 z-10 h-full w-full"
    />
  );
}
