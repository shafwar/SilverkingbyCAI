"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getCacheBustedMediaUrl } from "@/hooks/usePageSections";

type VideoGuardProps = Omit<React.ComponentPropsWithoutRef<"video">, "src"> & {
  url: string;
  version?: number;
  containerClassName?: string;
  /** When true, do not load video (e.g. slow connection); render poster placeholder instead */
  forcePoster?: boolean;
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
      posterUrl,
      posterVersion,
      lazyAttach = false,
      deferAttachUntilIdle = false,
      idleAttachTimeoutMs = 480,
      posterPriority = false,
      ...restVideoProps
    },
    ref
  ) {
    const rawVideo = restVideoProps as React.ComponentPropsWithoutRef<"video">;
    const { style: videoStyleProp, ...videoProps } = rawVideo;
    const [ready, setReady] = useState(false);
    const [inView, setInView] = useState(!lazyAttach);
    const [idleReady, setIdleReady] = useState(!deferAttachUntilIdle);
    const containerRef = useRef<HTMLDivElement>(null);
    const src = getCacheBustedMediaUrl(url, version);
    const bustedPoster =
      posterUrl && posterUrl.length > 0
        ? getCacheBustedMediaUrl(posterUrl, posterVersion)
        : null;

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

    const effectiveAttach = inView && idleReady;

    if (forcePoster) {
      return (
        <div
          className={containerClassName}
          style={{
            position: "relative",
            background: FALLBACK_POSTER_BG,
          }}
          aria-hidden
        />
      );
    }

    return (
      <div
        ref={containerRef}
        className={containerClassName}
        style={{ background: "#0a0a0a", position: "relative" }}
      >
        {/* Always show something behind the video — no blank frame */}
        <div
          className="absolute inset-0 z-0"
          style={{ background: FALLBACK_POSTER_BG }}
          aria-hidden
        />
        {bustedPoster ? (
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

        <video
          ref={ref}
          key={effectiveAttach ? src : "pending"}
          src={effectiveAttach ? src : undefined}
          poster={bustedPoster ?? undefined}
          onLoadedData={() => setReady(true)}
          onCanPlay={() => setReady(true)}
          {...videoProps}
          style={{
            ...style,
            ...videoStyleProp,
            opacity: ready ? 1 : 0,
            transition: "opacity 0.45s ease-out",
            willChange: "opacity",
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
