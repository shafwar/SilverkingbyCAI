"use client";

import { useEffect } from "react";

/**
 * useReliableVideoAutoplay
 *
 * Ensures background videos always try to autoplay without showing the default
 * play button UI – on both mobile (iOS/Android) and desktop.
 *
 * Usage:
 *   const videoRef = useRef<HTMLVideoElement | null>(null);
 *   useReliableVideoAutoplay(videoRef);
 *
 * Requirements on <video> tag:
 *   - autoPlay
 *   - muted
 *   - playsInline
 *   - loop (optional but recommended for backgrounds)
 */
export function useReliableVideoAutoplay(
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const tryPlay = async () => {
      if (cancelled || !video) return;

      try {
        // Ensure flags required for mobile autoplay are always set
        video.muted = true;
        (video as any).playsInline = true;
        if ((video as any).webkitPlaysInline !== undefined) {
          (video as any).webkitPlaysInline = true;
        }

        if (video.paused || video.readyState >= 2) {
          await video.play();
        }
      } catch {
        // Autoplay may be temporarily blocked; we will retry on the next event
      }
    };

    const handleCanPlay = () => {
      void tryPlay();
    };
    const handleLoadedData = () => {
      void tryPlay();
    };
    const handleLoadedMetadata = () => {
      void tryPlay();
    };
    const handlePause = () => {
      if (!video.ended) {
        void tryPlay();
      }
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void tryPlay();
      }
    };
    const handleUserInteraction = () => {
      void tryPlay();
    };

    // Initial attempt as soon as ref is available
    void tryPlay();

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("pause", handlePause);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("touchstart", handleUserInteraction, { passive: true });
    window.addEventListener("click", handleUserInteraction);

    return () => {
      cancelled = true;
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("pause", handlePause);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("click", handleUserInteraction);
    };
  }, [videoRef]);
}


