"use client";

import { useEffect, useRef } from "react";

export type ReliableVideoAutoplayMode = "default" | "background";

/**
 * useReliableVideoAutoplay
 *
 * Ensures background videos try to autoplay without native controls UI.
 *
 * - default: stronger retries + periodic checks (modals, secondary heroes).
 * - background: lighter touch — no video.load(), no preload override, longer watchdog interval,
 *   and styles are applied without replacing the entire style attribute (preserves opacity fades).
 */
export function useReliableVideoAutoplay(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options?: { mode?: ReliableVideoAutoplayMode }
) {
  const mode = options?.mode ?? "default";
  const isBackground = mode === "background";
  const retryCountRef = useRef(0);
  const playCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const enforceMobileAutoplayAttributes = () => {
      if (!video || cancelled) return;

      video.muted = true;
      video.volume = 0;

      (video as HTMLVideoElement & { webkitPlaysInline?: boolean }).playsInline = true;
      if ("webkitPlaysInline" in video) {
        (video as HTMLVideoElement & { webkitPlaysInline?: boolean }).webkitPlaysInline = true;
      }

      video.controls = false;
      video.removeAttribute("controls");

      if (!isBackground) {
        video.preload = "auto";
      }

      video.style.setProperty("pointer-events", "none", "important");
      video.style.setProperty("outline", "none", "important");
      video.style.setProperty("-webkit-tap-highlight-color", "transparent", "important");
      video.style.setProperty("-webkit-touch-callout", "none", "important");
      video.style.setProperty("user-select", "none", "important");
    };

    enforceMobileAutoplayAttributes();

    const tryPlay = async (force = false) => {
      if (cancelled || !video) return;

      try {
        enforceMobileAutoplayAttributes();

        if (force || video.paused) {
          retryCountRef.current = 0;
          await video.play();

          if (video.paused && !video.ended) {
            setTimeout(() => {
              if (!cancelled && video && video.paused) {
                video.play().catch(() => {});
              }
            }, 50);
          }
        }
      } catch {
        retryCountRef.current += 1;
        const delay = Math.min(100 * Math.pow(2, retryCountRef.current), isBackground ? 3000 : 2000);

        setTimeout(() => {
          if (!cancelled && video && video.paused) {
            tryPlay(true).catch(() => {});
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
      retryCountRef.current = 0;
    };

    const handlePause = () => {
      if (!video.ended && !cancelled) {
        setTimeout(() => {
          if (!cancelled && video && video.paused && !video.ended) {
            void tryPlay(true);
          }
        }, isBackground ? 250 : 100);
      }
    };

    const handleEnded = () => {
      if (!cancelled && video) {
        video.currentTime = 0;
        void tryPlay(true);
      }
    };

    const handleWaiting = () => {
      if (!cancelled && video && video.paused && !video.ended) {
        setTimeout(() => {
          if (!cancelled && video && video.paused) {
            void tryPlay(true);
          }
        }, isBackground ? 400 : 200);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && !cancelled && video && video.paused && !video.ended) {
        void tryPlay(true);
      }
    };

    const handleUserInteraction = () => {
      if (!cancelled && video) {
        void tryPlay(true);
      }
    };

    void tryPlay(true);

    const intervalMs = isBackground ? 12000 : 2000;
    playCheckIntervalRef.current = setInterval(() => {
      if (cancelled || !video) return;

      if (video.paused && !video.ended && !document.hidden) {
        void tryPlay(true);
      }
    }, intervalMs);

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("waiting", handleWaiting);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    window.addEventListener("touchstart", handleUserInteraction, { passive: true });
    window.addEventListener("touchend", handleUserInteraction, { passive: true });
    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("scroll", handleUserInteraction, { passive: true });

    if (!isBackground) {
      video.load();
    }

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
  }, [videoRef, isBackground]);
}
