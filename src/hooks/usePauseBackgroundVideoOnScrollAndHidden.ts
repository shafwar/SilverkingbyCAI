"use client";

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";

type Options = {
  /** Pause when scrollY exceeds this fraction of visual viewport height (0–1). */
  scrollPastVH?: number;
  enabled?: boolean;
  /** When set, updated each frame so useReliableVideoAutoplay can skip auto-resume. */
  holdPausedRef?: MutableRefObject<boolean>;
  /**
   * When true, pause while the browser window is not focused (Cmd-Tab, another app on top).
   * `document.hidden` does not always fire in that case; this cuts decoder/GPU use on laptops.
   */
  pauseOnWindowBlur?: boolean;
};

/**
 * Pauses a background &lt;video&gt; when the user scrolls past the hero and when the tab is hidden.
 * Resumes when scrolled back near the top (reduces GPU/decoder load during long scroll sessions).
 */
export function usePauseBackgroundVideoOnScrollAndHidden(
  videoRef: RefObject<HTMLVideoElement | null>,
  options?: Options
) {
  const scrollPastVH = options?.scrollPastVH ?? 0.45;
  const enabled = options?.enabled ?? true;
  const holdPausedRef = options?.holdPausedRef;
  const pauseOnWindowBlur = options?.pauseOnWindowBlur ?? false;
  const windowBlurredRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let raf = 0;
    let scheduled = false;

    const tick = () => {
      scheduled = false;
      const video = videoRef.current;
      if (!video) return;

      const vh = window.visualViewport?.height ?? window.innerHeight;
      const y = window.scrollY || document.documentElement.scrollTop;
      const scrolledPast = y > vh * scrollPastVH;
      const blurred = pauseOnWindowBlur && windowBlurredRef.current;
      const hold = document.hidden || scrolledPast || blurred;
      if (holdPausedRef) holdPausedRef.current = hold;

      if (document.hidden || blurred) {
        if (!video.paused) video.pause();
        return;
      }

      if (scrolledPast) {
        if (!video.paused) video.pause();
      } else if (video.paused) {
        const src = video.getAttribute("src");
        if ((src && src.trim()) || video.currentSrc) {
          void video.play().catch(() => {});
        }
      }
    };

    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      raf = requestAnimationFrame(tick);
    };

    const onWinBlur = () => {
      windowBlurredRef.current = true;
      tick();
    };
    const onWinFocus = () => {
      windowBlurredRef.current = false;
      tick();
    };

    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", tick);
    if (pauseOnWindowBlur) {
      window.addEventListener("blur", onWinBlur);
      window.addEventListener("focus", onWinFocus);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", tick);
      if (pauseOnWindowBlur) {
        window.removeEventListener("blur", onWinBlur);
        window.removeEventListener("focus", onWinFocus);
      }
      cancelAnimationFrame(raf);
      windowBlurredRef.current = false;
      if (holdPausedRef) holdPausedRef.current = false;
    };
  }, [enabled, scrollPastVH, pauseOnWindowBlur, videoRef, holdPausedRef]);
}
