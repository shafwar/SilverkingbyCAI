"use client";

import { useEffect, useRef } from "react";

export type ReliableVideoAutoplayMode = "default" | "background";

/**
 * useReliableVideoAutoplay
 *
 * Ensures background videos try to autoplay without native controls UI.
 *
 * - default: stronger retries + periodic checks (modals, secondary heroes).
 * - background: no video.load(), no preload override, longer watchdog interval, no scroll/click
 *   listeners (they caused jank), skip play() when already playing or when video has no src,
 *   styles applied without replacing the entire style attribute (preserves opacity fades).
 *
 * - reattachKey: increment when the <video> DOM is recreated (e.g. leave home → return). The ref
 *   object is stable so React would otherwise not re-run this effect, leaving the new element
 *   without listeners (common blank / no-autoplay on mobile SPA).
 */
export function useReliableVideoAutoplay(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options?: {
    mode?: ReliableVideoAutoplayMode;
    reattachKey?: number | string;
    /** When true (e.g. scrolled past hero), do not auto-resume after pause — see usePauseBackgroundVideoOnScrollAndHidden */
    holdPausedRef?: React.MutableRefObject<boolean>;
  }
) {
  const mode = options?.mode ?? "default";
  const isBackground = mode === "background";
  const reattachKey = options?.reattachKey ?? 0;
  const holdPausedRef = options?.holdPausedRef;
  const retryCountRef = useRef(0);
  const playCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let retryTimeoutId = 0;
    let detach: (() => void) | undefined;

    const attachTo = (video: HTMLVideoElement) => {
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
        if (holdPausedRef?.current) return;

        const srcAttr = video.getAttribute("src");
        if (!(srcAttr && srcAttr.trim()) && !video.currentSrc) {
          return;
        }

        try {
          enforceMobileAutoplayAttributes();

          if (!video.paused && !video.ended && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            return;
          }

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
        if (holdPausedRef?.current) return;
        if (!video.ended && !cancelled) {
          setTimeout(() => {
            if (holdPausedRef?.current) return;
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
        if (holdPausedRef?.current) return;
        if (!cancelled && video && video.paused && !video.ended) {
          setTimeout(() => {
            if (holdPausedRef?.current) return;
            if (!cancelled && video && video.paused) {
              void tryPlay(true);
            }
          }, isBackground ? 400 : 200);
        }
      };

      const handleVisibilityChange = () => {
        if (holdPausedRef?.current) return;
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

      const intervalMs = isBackground ? 20000 : 2000;
      playCheckIntervalRef.current = setInterval(() => {
        if (cancelled || !video) return;
        if (holdPausedRef?.current) return;

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

      if (!isBackground) {
        window.addEventListener("touchstart", handleUserInteraction, { passive: true });
        window.addEventListener("touchend", handleUserInteraction, { passive: true });
        window.addEventListener("click", handleUserInteraction);
        window.addEventListener("scroll", handleUserInteraction, { passive: true });
      }

      if (!isBackground) {
        video.load();
      }

      detach = () => {
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
        if (!isBackground) {
          window.removeEventListener("touchstart", handleUserInteraction);
          window.removeEventListener("touchend", handleUserInteraction);
          window.removeEventListener("click", handleUserInteraction);
          window.removeEventListener("scroll", handleUserInteraction);
        }
      };
    };

    const tryAttach = () => {
      const v = videoRef.current;
      if (!v || cancelled) return false;
      attachTo(v);
      return true;
    };

    if (!tryAttach()) {
      rafId = requestAnimationFrame(() => {
        if (cancelled) return;
        if (!tryAttach()) {
          retryTimeoutId = window.setTimeout(() => {
            if (cancelled) return;
            tryAttach();
          }, 48);
        }
      });
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (retryTimeoutId) window.clearTimeout(retryTimeoutId);
      detach?.();
    };
  }, [videoRef, isBackground, reattachKey, holdPausedRef]);
}
