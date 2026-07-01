"use client";

import { forwardRef, type ReactNode, type Ref } from "react";
import { CmsPageHeroBackground } from "@/components/hero/CmsPageHeroBackground";
import {
  MerchStyleHeroCopy,
  type MerchStyleHeroCopyProps,
} from "@/components/layout/MerchStyleHeroCopy";
import { HERO_MEDIA_SHELL_STYLE } from "@/lib/hero-media-defaults";
import type { PageHeroCmsSlug } from "@/lib/page-hero-cms-config";

const DEFAULT_OVERLAY = (
  <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-luxury-black via-luxury-black/60 to-luxury-black/40" />
);

function HeroSeamCover() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[1] h-[3px] bg-luxury-black pointer-events-none"
      aria-hidden
    />
  );
}

function HeroScrollIndicator() {
  return (
    <div className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-3 pointer-events-none">
      <div className="relative flex h-8 w-5 items-start justify-center rounded-full border border-white/50 pt-2.5">
        <div className="h-1.5 w-1 bg-white/70 rounded-full" />
      </div>
    </div>
  );
}

export type PageHeroMediaProps = {
  page: PageHeroCmsSlug;
  videoRef?: Ref<HTMLVideoElement>;
  objectPosition?: string;
  overlay?: ReactNode;
  containerClassName?: string;
};

/** Merchandise-pattern media layer — single source for all page hero backgrounds. */
export const PageHeroMedia = forwardRef<HTMLVideoElement, PageHeroMediaProps>(
  function PageHeroMedia(
    {
      page,
      objectPosition = "center center",
      overlay = DEFAULT_OVERLAY,
      containerClassName = "absolute inset-0 h-full w-full",
    },
    ref
  ) {
    return (
      <div className="absolute inset-0 overflow-hidden" style={HERO_MEDIA_SHELL_STYLE}>
        <CmsPageHeroBackground
          ref={ref}
          page={page}
          containerClassName={containerClassName}
          objectPosition={objectPosition}
          overlay={overlay}
        />
      </div>
    );
  }
);

export type PageHeroSectionProps = {
  page: PageHeroCmsSlug;
  sectionRef?: Ref<HTMLElement>;
  videoRef?: Ref<HTMLVideoElement>;
  objectPosition?: string;
  overlay?: ReactNode;
  showSeam?: boolean;
  showScrollIndicator?: boolean;
  className?: string;
  copy?: MerchStyleHeroCopyProps;
  children?: ReactNode;
};

/** Unified full-viewport hero section — merchandise foundation. */
export function PageHeroSection({
  page,
  sectionRef,
  videoRef,
  objectPosition,
  overlay,
  showSeam = true,
  showScrollIndicator = true,
  className = "",
  copy,
  children,
}: PageHeroSectionProps) {
  return (
    <section
      ref={sectionRef}
      className={`relative isolate min-h-[100dvh] overflow-hidden ${className}`.trim()}
    >
      <PageHeroMedia
        ref={videoRef}
        page={page}
        objectPosition={objectPosition}
        overlay={overlay}
      />
      {showSeam ? <HeroSeamCover /> : null}
      {copy ? <MerchStyleHeroCopy {...copy} /> : children}
      {showScrollIndicator ? <HeroScrollIndicator /> : null}
    </section>
  );
}
