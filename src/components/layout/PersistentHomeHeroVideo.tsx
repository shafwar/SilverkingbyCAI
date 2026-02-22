"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { getR2UrlClient } from "@/utils/r2-url";
import { usePageSections } from "@/hooks/usePageSections";
import { HeroEditPortal } from "@/components/layout/HeroEditPortal";

const HERO_VIDEO_FALLBACK = "/videos/hero/hero-background.mp4";
const PLAY_RETRY_MAX = 5;
const PLAY_RETRY_DELAY_MS = 400;
const HEARTBEAT_INTERVAL_MS = 2500;
const VIDEO_ERROR_REMOUNT_MAX = 2;

function isHomePath(pathname: string | null): boolean {
  const path = (pathname ?? "").replace(/\/$/, "").trim() || "/";
  return path === "/" || path === "/en" || path === "/id";
}

function getIsHomeFromPath(path: string | null): boolean {
  return isHomePath(path);
}

type PersistentHomeHeroVideoProps = {
  /** When false, edit button is hidden until splash is done. Omit on locale home (no splash). */
  splashComplete?: boolean;
};

/**
 * Persistent hero video for Home. Optimized so the video is always visible and
 * playing when on home: stable src, retry play, tab-visible replay, heartbeat recovery.
 */
export function PersistentHomeHeroVideo({ splashComplete = true }: PersistentHomeHeroVideoProps) {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHome, setIsHome] = useState(() =>
    typeof window !== "undefined" ? getIsHomeFromPath(window.location.pathname) : false
  );
  const { sections, refetch } = usePageSections("home");
  const playAttempts = useRef(0);
  const [videoKey, setVideoKey] = useState(0);

  // Stable URL: never empty; prefer CMS, always fallback to static asset
  const src = useMemo(() => {
    const url = sections.hero?.url?.trim();
    return url ? url : getR2UrlClient(HERO_VIDEO_FALLBACK);
  }, [sections.hero?.url]);

  useEffect(() => {
    setIsHome(getIsHomeFromPath(pathname));
  }, [pathname]);

  const tryPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isHome) return;
    if (video.readyState < 2) return; // HAVE_CURRENT_DATA or more
    video.play().then(() => {
      playAttempts.current = 0;
    }).catch(() => {
      playAttempts.current += 1;
      if (playAttempts.current <= PLAY_RETRY_MAX) {
        setTimeout(tryPlay, PLAY_RETRY_DELAY_MS * playAttempts.current);
      }
    });
  }, [isHome]);

  useEffect(() => {
    if (!isHome) {
      videoRef.current?.pause();
      return;
    }
    tryPlay();
  }, [isHome, tryPlay]);

  // When tab becomes visible again, ensure video plays (browsers may pause background tabs)
  useEffect(() => {
    if (!isHome) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        playAttempts.current = 0;
        tryPlay();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isHome, tryPlay]);

  // Heartbeat: if we're on home and video is paused, try play again (recovers from any glitch)
  useEffect(() => {
    if (!isHome) return;
    const id = setInterval(() => {
      const video = videoRef.current;
      if (video && isHome && video.paused && video.readyState >= 2) {
        playAttempts.current = 0;
        tryPlay();
      }
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isHome, tryPlay]);

  const handleVideoLoaded = useCallback(() => {
    playAttempts.current = 0;
    tryPlay();
  }, [tryPlay]);

  const handleVideoError = useCallback(() => {
    if (videoKey < VIDEO_ERROR_REMOUNT_MAX) {
      setVideoKey((k) => k + 1);
    }
  }, [videoKey]);

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
        key={`${src}-${videoKey}`}
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
        onLoadedData={handleVideoLoaded}
        onCanPlay={handleVideoLoaded}
        onError={handleVideoError}
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
