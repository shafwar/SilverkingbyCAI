"use client";

import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { getCacheBustedMediaUrl } from "@/hooks/usePageSections";

type VideoGuardProps = Omit<React.ComponentPropsWithoutRef<"video">, "src"> & {
  url: string;
  version?: number;
  containerClassName?: string;
  /** When true, do not load video (e.g. slow connection); render poster placeholder instead */
  forcePoster?: boolean;
  /** When true, never attach video src (poster / gradient only) — e.g. prefers-reduced-motion */
  suspendSrc?: boolean;
  /** Optional CMS/static poster URL (PageMedia hero image, etc.) */
  posterUrl?: string | null;
  posterVersion?: number;
  /** Wait for intersection before attaching video src (saves bandwidth; hero is usually visible immediately) */
  lazyAttach?: boolean;
  /** After visible, defer attaching src until idle (better LCP / less main-thread contention) */
  deferAttachUntilIdle?: boolean;
  /** Max wait for idle callback before attaching anyway (ms) */
  idleAttachTimeoutMs?: number;
  /** High priority fetch for above-the-fold poster (home hero) */
  posterPriority?: boolean;
  /**
   * When true, do not render a separate next/image poster layer — use only the native
   * <video poster> so a full-bleed image does not steal LCP from headline text.
   */
  lcpFriendlyPoster?: boolean;
  /** Promote stable GPU layer + drop will-change after fade (smoother video decode on laptops) */
  optimizeGpu?: boolean;
  /** Shorter opacity fade on the video element (less overlap with layout transitions / decode) */
  lightVideoFade?: boolean;
  /** No CSS transition on video opacity — use when a parent already fades (avoids double animation + jank) */
  snapVideoOpacity?: boolean;
};

type ImageGuardProps = Omit<React.ComponentPropsWithoutRef<"img">, "src"> & {
  url: string;
  version?: number;
  containerClassName?: string;
  /** When true (hero/above-fold), use fetchPriority high and eager load for faster LCP */
  priority?: boolean;
};

const FALLBACK_POSTER_BG =
  "linear-gradient(180deg, #080808 0%, #050505 50%, #030303 100%), radial-gradient(ellipse 80% 60% at 50% 40%, rgba(212,175,55,0.05) 0%, transparent 55%)";

/**
 * CMS-safe video: poster/placeholder always visible, optional lazy src attach, fade-in when ready.
 */
export const VideoLoadGuard = forwardRef<HTMLVideoElement, VideoGuardProps>(
  function VideoLoadGuard(
    {
      url,
      version,
      containerClassName = "",
      style,
      forcePoster = false,
      suspendSrc = false,
      posterUrl,
      posterVersion,
      lazyAttach = false,
      deferAttachUntilIdle = false,
      idleAttachTimeoutMs = 480,
      posterPriority = false,
      lcpFriendlyPoster = false,
      optimizeGpu = false,
      lightVideoFade = false,
      snapVideoOpacity = false,
      ...restVideoProps
    },
    ref
  ) {
    const rawVideo = restVideoProps as React.ComponentPropsWithoutRef<"video">;
    const { style: videoStyleProp, ...videoProps } = rawVideo;
    const [ready, setReady] = useState(false);
    const [fadeComplete, setFadeComplete] = useState(false);
    const fadeTimerRef = useRef<number | null>(null);
    const [inView, setInView] = useState(!lazyAttach);
    const [idleReady, setIdleReady] = useState(!deferAttachUntilIdle);
    const containerRef = useRef<HTMLDivElement>(null);
    const src = getCacheBustedMediaUrl(url, version);
    const bustedPoster =
      posterUrl && posterUrl.length > 0
        ? getCacheBustedMediaUrl(posterUrl, posterVersion)
        : null;

    /** iOS/WebKit: IntersectionObserver occasionally misses fixed full-bleed heroes; prime from layout. */
    useLayoutEffect(() => {
      if (!lazyAttach) return;
      const el = containerRef.current;
      if (!el || typeof window === "undefined") return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > -vh * 0.25 &&
        rect.top < vh * 1.25 &&
        rect.right > -vw * 0.1 &&
        rect.left < vw * 1.1;
      if (visible) setInView(true);
    }, [lazyAttach]);

    useEffect(() => {
      if (!lazyAttach) return;
      const root = containerRef.current;
      if (!root) return;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) setInView(true);
        },
        { root: null, rootMargin: "200px 0px", threshold: 0.01 }
      );
      io.observe(root);
      return () => io.disconnect();
    }, [lazyAttach]);

    useEffect(() => {
      if (!deferAttachUntilIdle) {
        setIdleReady(true);
        return;
      }
      if (lazyAttach && !inView) return;

      let cancelled = false;
      const done = () => {
        if (!cancelled) setIdleReady(true);
      };

      if (typeof window === "undefined") {
        done();
        return;
      }

      const w = globalThis as Window & typeof globalThis;
      if ("requestIdleCallback" in w && typeof w.requestIdleCallback === "function") {
        const id = w.requestIdleCallback(done, { timeout: idleAttachTimeoutMs });
        return () => {
          cancelled = true;
          w.cancelIdleCallback(id);
        };
      }

      const t = w.setTimeout(done, Math.min(idleAttachTimeoutMs, 320));
      return () => {
        cancelled = true;
        w.clearTimeout(t);
      };
    }, [deferAttachUntilIdle, lazyAttach, inView, idleAttachTimeoutMs]);

    useEffect(() => {
      return () => {
        if (fadeTimerRef.current !== null) {
          clearTimeout(fadeTimerRef.current);
          fadeTimerRef.current = null;
        }
      };
    }, []);

    const effectiveAttach = inView && idleReady && !suspendSrc;

    useEffect(() => {
      setReady(false);
      setFadeComplete(false);
      if (fadeTimerRef.current !== null) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    }, [src, effectiveAttach]);

    const markReady = () => {
      setReady(true);
      if (!optimizeGpu) return;
      if (fadeTimerRef.current !== null) return;
      const w = globalThis as Window & typeof globalThis;
      fadeTimerRef.current = w.setTimeout(() => {
        setFadeComplete(true);
        fadeTimerRef.current = null;
      }, 480);
    };

    if (forcePoster) {
      return (
        <div
          className={containerClassName}
          style={{
            position: "relative",
            background: "#0a0a0a",
          }}
          aria-hidden
        >
          <div
            className="absolute inset-0 z-0"
            style={{ background: FALLBACK_POSTER_BG }}
            aria-hidden
          />
          {bustedPoster && !lcpFriendlyPoster ? (
            <div className="absolute inset-0 z-[1] overflow-hidden">
              <Image
                src={bustedPoster}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                priority={posterPriority}
                fetchPriority={posterPriority ? "high" : "low"}
              />
            </div>
          ) : bustedPoster && lcpFriendlyPoster ? (
            <div
              className="absolute inset-0 z-[1] bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${bustedPoster})` }}
              aria-hidden
            />
          ) : null}
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={containerClassName}
        style={{
          background: "#0a0a0a",
          position: "relative",
          ...(optimizeGpu
            ? {
                transform: "translateZ(0)",
                isolation: "isolate" as const,
              }
            : {}),
        }}
      >
        {/* Always show something behind the video — no blank frame */}
        <div
          className="absolute inset-0 z-0"
          style={{ background: FALLBACK_POSTER_BG }}
          aria-hidden
        />
        {bustedPoster && !lcpFriendlyPoster ? (
          <div className="absolute inset-0 z-[1] overflow-hidden">
            <Image
              src={bustedPoster}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              priority={posterPriority}
              fetchPriority={posterPriority ? "high" : "low"}
            />
          </div>
        ) : null}

        {/* Include version in key so CMS replace at same R2 path forces a fresh decoder (no 1-frame old video). */}
        <video
          ref={ref}
          key={effectiveAttach ? `${src}::v${version ?? "na"}` : "pending"}
          src={effectiveAttach ? src : undefined}
          poster={bustedPoster ?? undefined}
          onLoadedData={markReady}
          onCanPlay={markReady}
          {...videoProps}
          style={{
            ...style,
            ...videoStyleProp,
            opacity: ready ? 1 : 0,
            transition: snapVideoOpacity
              ? "none"
              : lightVideoFade
                ? "opacity 0.22s ease-out"
                : "opacity 0.45s ease-out",
            willChange: optimizeGpu && fadeComplete ? "auto" : "opacity",
            ...(optimizeGpu
              ? {
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }
              : {}),
          }}
          preload={
            effectiveAttach ? (videoProps.preload ?? "metadata") : "none"
          }
        />
      </div>
    );
  }
);

/**
 * Renders image with black background; image only becomes visible after onLoad.
 * Cache-busts URL with version so browser never serves stale file.
 */
export function ImageLoadGuard({
  url,
  version,
  containerClassName = "",
  style,
  priority = false,
  ...imgProps
}: ImageGuardProps) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = getCacheBustedMediaUrl(url, version);

  const showImage = ready && !failed;
  const showPlaceholder = failed;
  const { onLoad, onError, ...restImgProps } = imgProps;

  return (
    <div className={containerClassName} style={{ background: "#0a0a0a", position: "relative" }}>
      <img
        key={src}
        src={src}
        alt={imgProps.alt ?? ""}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? "eager" : "lazy"}
        onLoad={(e) => {
          setReady(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          setFailed(true);
          onError?.(e);
        }}
        style={{
          ...style,
          opacity: showImage ? 1 : 0,
          transition: "opacity 0.2s ease-out",
          pointerEvents: showPlaceholder ? "none" : undefined,
        }}
        {...restImgProps}
      />
    </div>
  );
}
