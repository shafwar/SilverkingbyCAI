"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { getR2UrlClient } from "@/utils/r2-url";
import { usePageSections } from "@/hooks/usePageSections";
import { VideoLoadGuard } from "@/components/section-media/SectionMediaLoadGuard";
import { HeroEditPortal } from "@/components/layout/HeroEditPortal";

const HERO_VIDEO_FALLBACK = "/videos/hero/hero-background.mp4";

function isHomePath(pathname: string | null): boolean {
  const path = (pathname ?? "").replace(/\/$/, "").trim() || "/";
  return path === "/" || path === "/en" || path === "/id";
}

type PersistentHomeHeroVideoProps = {
  /** When false, edit button is hidden until splash is done. Omit on locale home (no splash). */
  splashComplete?: boolean;
};

/**
 * Persistent hero video for Home. Rendered in layout so it does NOT unmount
 * when navigating away. Video URL from page-sections (CMS) or fallback.
 * Admin sees edit icon (after delay) and can replace video (upload to R2).
 * On root home, pass splashComplete so the edit button only appears after splash.
 * Uses simple isHome from pathname (no window in initial state) to avoid hydration mismatch.
 */
export function PersistentHomeHeroVideo({ splashComplete = true }: PersistentHomeHeroVideoProps) {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHome, setIsHome] = useState(false);
  const { sections, loading: sectionsLoading, refetch } = usePageSections("home");
  const heroUrl = sections.hero?.url ?? getR2UrlClient(HERO_VIDEO_FALLBACK);
  const heroVersion = sections.hero?.version;

  useEffect(() => {
    setIsHome(isHomePath(pathname));
  }, [pathname]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isHome) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isHome]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 min-h-dvh pointer-events-none overflow-hidden"
      style={{
        visibility: isHome ? "visible" : "hidden",
        opacity: isHome ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
    >
      {/* No media until section data loaded; cache-bust + load guard for stability (no glimpse of old asset) */}
      {sectionsLoading ? (
        <div className="absolute inset-0 bg-luxury-black" aria-hidden />
      ) : (
        <div className="absolute inset-0 overflow-hidden">
          {/* Mobile: zoom out (112% container scaled to 90% = more of video visible) */}
          <div
            className="absolute left-1/2 top-1/2 h-[112%] w-[112%] min-h-[112%] min-w-[112%] -translate-x-1/2 -translate-y-1/2 origin-center scale-90 md:left-0 md:top-0 md:h-full md:w-full md:min-h-0 md:min-w-0 md:translate-x-0 md:translate-y-0 md:scale-100"
            aria-hidden
          >
            <VideoLoadGuard
              ref={videoRef}
              url={heroUrl}
              version={heroVersion}
              containerClassName="absolute inset-0 min-w-full min-h-full w-full h-full"
              className="absolute left-1/2 top-1/2 min-w-full min-h-full w-full h-full -translate-x-1/2 -translate-y-1/2 object-cover"
              style={{ pointerEvents: "none" }}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              disableRemotePlayback
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        </div>
      )}
      {/* Vignette / dark motif - Home only */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-transparent to-black/40 pointer-events-none" />
      {/* Edit video: only after splash is complete (root home) or after delay (locale home) */}
      {isHome && splashComplete && (
        <HeroEditPortal
          page="home"
          section="hero"
          type="video"
          onUploadDone={refetch}
          editLabel="Edit video"
        />
      )}
    </div>
  );
}
