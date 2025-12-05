"use client";

import { useEffect, useRef } from "react";

/**
 * useReliableVideoAutoplay
 *
 * Ensures background videos always try to autoplay without showing the default
 * play button UI – on both mobile (iOS/Android) and desktop.
 *
 * This hook uses multiple strategies to ensure video autoplay works reliably:
 * 1. Sets all required mobile autoplay attributes
 * 2. Hides native browser controls via CSS
 * 3. Prevents user interaction with the video
 * 4. Uses aggressive retry mechanism with exponential backoff
 * 5. Monitors video state continuously
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
 *   - no controls attribute
 */
export function useReliableVideoAutoplay(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const retryCountRef = useRef(0);
  const playCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    // CRITICAL: Set all mobile autoplay requirements IMMEDIATELY
    const enforceMobileAutoplayAttributes = () => {
      if (!video || cancelled) return;

      // Force muted (required for autoplay)
      video.muted = true;
      video.volume = 0;

      // Force playsInline for iOS
      (video as any).playsInline = true;
      if ((video as any).webkitPlaysInline !== undefined) {
        (video as any).webkitPlaysInline = true;
      }

      // Remove controls to prevent browser UI
      video.controls = false;
      video.removeAttribute("controls");

      // Set preload to ensure video loads
      video.preload = "auto";

      // Hide native controls via CSS
      video.style.pointerEvents = "none";
      video.style.outline = "none";
      video.setAttribute(
        "style",
        `
        pointer-events: none !important;
        outline: none !important;
        -webkit-tap-highlight-color: transparent !important;
        -webkit-touch-callout: none !important;
        user-select: none !important;
      `
      );
    };

    // Enforce attributes immediately
    enforceMobileAutoplayAttributes();

    const tryPlay = async (force = false) => {
      if (cancelled || !video) return;

      try {
        // Re-enforce attributes before each play attempt
        enforceMobileAutoplayAttributes();

        // Only try to play if video is paused or forced
        if (force || video.paused) {
          // Reset retry count on successful play
          retryCountRef.current = 0;
          await video.play();

          // Double-check: if still paused after play(), try again
          if (video.paused && !video.ended) {
            setTimeout(() => {
              if (!cancelled && video && video.paused) {
                video.play().catch(() => {
                  // Silent fail, will retry on next event
                });
              }
            }, 50);
          }
        }
      } catch (error) {
        // Autoplay may be temporarily blocked; we will retry
        retryCountRef.current += 1;

        // Exponential backoff for retries
        const delay = Math.min(100 * Math.pow(2, retryCountRef.current), 2000);

        setTimeout(() => {
          if (!cancelled && video && video.paused) {
            tryPlay(true).catch(() => {
              // Silent fail
            });
          }
        }, delay);
      }
    };

    const handleCanPlay = () => {
      void tryPlay(true);
    };

    const handleLoadedData = () => {
      void tryPlay(true);
    };

    const handleLoadedMetadata = () => {
      void tryPlay(true);
    };

    const handlePlay = () => {
      // Video started playing, reset retry count
      retryCountRef.current = 0;
    };

    const handlePause = () => {
      if (!video.ended && !cancelled) {
        // Small delay to avoid infinite loop
        setTimeout(() => {
          if (!cancelled && video && video.paused && !video.ended) {
            void tryPlay(true);
          }
        }, 100);
      }
    };

    const handleEnded = () => {
      // Restart video immediately for seamless loop
      if (!cancelled && video) {
        video.currentTime = 0;
        void tryPlay(true);
      }
    };

    const handleWaiting = () => {
      // Video is buffering, will resume automatically when ready
      // But we can also try to play if it's paused
      if (!cancelled && video && video.paused && !video.ended) {
        setTimeout(() => {
          if (!cancelled && video && video.paused) {
            void tryPlay(true);
          }
        }, 200);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && !cancelled && video && video.paused && !video.ended) {
        void tryPlay(true);
      }
    };

    const handleUserInteraction = () => {
      // Any user interaction should trigger autoplay attempt
      if (!cancelled && video) {
        void tryPlay(true);
      }
    };

    // Initial attempt as soon as ref is available
    void tryPlay(true);

    // Continuous monitoring - check every 2 seconds if video is playing
    playCheckIntervalRef.current = setInterval(() => {
      if (cancelled || !video) return;

      if (video.paused && !video.ended && !document.hidden) {
        void tryPlay(true);
      }
    }, 2000);

    // Event listeners
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("waiting", handleWaiting);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Listen for any user interaction to trigger autoplay
    window.addEventListener("touchstart", handleUserInteraction, { passive: true });
    window.addEventListener("touchend", handleUserInteraction, { passive: true });
    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("scroll", handleUserInteraction, { passive: true });

    // Force load video
    video.load();

    return () => {
      cancelled = true;

      if (playCheckIntervalRef.current) {
        clearInterval(playCheckIntervalRef.current);
        playCheckIntervalRef.current = null;
      }

      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("waiting", handleWaiting);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("touchend", handleUserInteraction);
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("scroll", handleUserInteraction);
    };
  }, [videoRef]);
}
