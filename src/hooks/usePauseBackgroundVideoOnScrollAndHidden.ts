"use client";

import { useEffect, type MutableRefObject, type RefObject } from "react";

type Options = {
  /** Pause when scrollY exceeds this fraction of visual viewport height (0–1). */
  scrollPastVH?: number;
  enabled?: boolean;
  /** When set, updated each frame so useReliableVideoAutoplay can skip auto-resume. */
  holdPausedRef?: MutableRefObject<boolean>;
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
      const hold = document.hidden || scrolledPast;
      if (holdPausedRef) holdPausedRef.current = hold;

      if (document.hidden) {
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

    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", tick);
      cancelAnimationFrame(raf);
      if (holdPausedRef) holdPausedRef.current = false;
    };
  }, [enabled, scrollPastVH, videoRef, holdPausedRef]);
}
