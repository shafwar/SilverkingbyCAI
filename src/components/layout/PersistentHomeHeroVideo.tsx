"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { getR2UrlClient } from "@/utils/r2-url";
import { usePageSections } from "@/hooks/usePageSections";
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
  const { sections, refetch } = usePageSections("home");
  const src = sections.hero?.url ?? getR2UrlClient(HERO_VIDEO_FALLBACK);

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
      {/* Full viewport cover on all devices: no black gaps on mobile */}
      <video
        ref={videoRef}
        key={src}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        className="absolute left-1/2 top-1/2 min-w-full min-h-full w-full h-full -translate-x-1/2 -translate-y-1/2 object-cover"
        style={{
          pointerEvents: "none",
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <source src={src} type="video/mp4" />
      </video>
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
