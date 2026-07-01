"use client";

import { forwardRef, useCallback, useRef, type ReactNode } from "react";
import { VideoLoadGuard, ImageLoadGuard } from "@/components/section-media/SectionMediaLoadGuard";
import { useShouldLoadHeroVideo } from "@/hooks/useShouldLoadHeroVideo";
import { useReliableVideoAutoplay } from "@/hooks/useReliableVideoAutoplay";
import { usePageHeroCms } from "@/hooks/usePageHeroCms";
import {
  HERO_VIDEO_COVER_STYLE,
  HERO_VIDEO_MERCH_PATTERN,
  HERO_VIDEO_POINTER_STYLE,
} from "@/lib/hero-media-defaults";
import type { PageHeroCmsSlug } from "@/lib/page-hero-cms-config";

export type CmsPageHeroBackgroundProps = {
  page: PageHeroCmsSlug;
  containerClassName?: string;
  videoClassName?: string;
  objectPosition?: string;
  overlay?: ReactNode;
};

/**
 * Unified CMS hero media layer — static R2 fallback, optional CMS swap after idle.
 */
export const CmsPageHeroBackground = forwardRef<HTMLVideoElement, CmsPageHeroBackgroundProps>(
  function CmsPageHeroBackground(
    {
      page,
      containerClassName = "absolute inset-0 h-full w-full",
      videoClassName = "absolute inset-0 h-full w-full object-cover pointer-events-none select-none",
      objectPosition = "center center",
      overlay,
    },
    forwardedRef
  ) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const shouldLoadHeroVideo = useShouldLoadHeroVideo();
    const {
      heroMediaType,
      heroMediaUrl,
      heroPosterUrl,
      heroVideoPlayUrl,
      heroVersion,
      posterVersion,
    } = usePageHeroCms(page);

    const setVideoRef = useCallback(
      (node: HTMLVideoElement | null) => {
        videoRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef]
    );

    useReliableVideoAutoplay(videoRef, {
      mode: "background",
      reattachKey: heroVideoPlayUrl,
    });

    return (
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ transform: "translateZ(0)", WebkitBackfaceVisibility: "hidden" }}
      >
        {heroMediaType === "VIDEO" ? (
          <VideoLoadGuard
            key={`cms-hero-${page}-${heroVideoPlayUrl}-${heroVersion ?? 0}`}
            ref={setVideoRef}
            url={heroVideoPlayUrl}
            version={heroVersion}
            posterUrl={heroPosterUrl}
            posterVersion={posterVersion}
            forcePoster={!shouldLoadHeroVideo}
            {...HERO_VIDEO_MERCH_PATTERN}
            containerClassName={containerClassName}
            className={videoClassName}
            style={{
              ...HERO_VIDEO_COVER_STYLE,
              ...HERO_VIDEO_POINTER_STYLE,
              objectPosition,
              transform: "translateZ(0)",
              WebkitTransform: "translateZ(0)",
            }}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            onContextMenu={(e) => e.preventDefault()}
            onPlay={(e) => {
              const video = e.currentTarget;
              if (video.paused) video.play().catch(() => {});
            }}
          />
        ) : (
          <ImageLoadGuard
            url={heroMediaUrl}
            version={heroVersion}
            containerClassName={containerClassName}
            className={videoClassName}
            style={{
              objectFit: "cover",
              objectPosition,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
            alt=""
            priority
          />
        )}
        {overlay}
      </div>
    );
  }
);
