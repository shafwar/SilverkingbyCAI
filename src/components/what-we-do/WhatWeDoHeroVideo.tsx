"use client";

import { CmsPageHeroBackground } from "@/components/hero/CmsPageHeroBackground";

/** Frame subject lower so centered copy sits over background, not the focal point. */
const WHAT_WE_DO_HERO_OBJECT_POSITION = "center 32%";

export function WhatWeDoHeroVideo() {
  return (
    <CmsPageHeroBackground
      page="what-we-do"
      containerClassName="absolute inset-0 z-10 h-full w-full"
      objectPosition={WHAT_WE_DO_HERO_OBJECT_POSITION}
    />
  );
}
