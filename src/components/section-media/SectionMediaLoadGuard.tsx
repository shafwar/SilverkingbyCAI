"use client";

import { forwardRef, useState } from "react";
import { getCacheBustedMediaUrl } from "@/hooks/usePageSections";

type VideoGuardProps = Omit<React.ComponentPropsWithoutRef<"video">, "src"> & {
  url: string;
  version?: number;
  containerClassName?: string;
  /** When true, do not load video (e.g. slow connection); render poster placeholder instead */
  forcePoster?: boolean;
};

type ImageGuardProps = Omit<React.ComponentPropsWithoutRef<"img">, "src"> & {
  url: string;
  version?: number;
  containerClassName?: string;
  /** When true (hero/above-fold), use fetchPriority high and eager load for faster LCP */
  priority?: boolean;
};

/**
 * Renders video with black background; video only becomes visible after onLoadedData.
 * Cache-busts URL with version so browser never serves stale file (stability between old/new asset).
 */
export const VideoLoadGuard = forwardRef<HTMLVideoElement, VideoGuardProps>(
  function VideoLoadGuard({ url, version, containerClassName = "", style, forcePoster = false, ...videoProps }, ref) {
    const [ready, setReady] = useState(false);
    const src = getCacheBustedMediaUrl(url, version);

    if (forcePoster) {
      return (
        <div
          className={containerClassName}
          style={{
            position: "relative",
            background:
              "linear-gradient(180deg, #080808 0%, #050505 50%, #030303 100%), radial-gradient(ellipse 80% 60% at 50% 40%, rgba(212,175,55,0.05) 0%, transparent 55%)",
          }}
          aria-hidden
        />
      );
    }

    return (
      <div className={containerClassName} style={{ background: "#0a0a0a", position: "relative" }}>
        <video
          ref={ref}
          key={src}
          src={src}
          onLoadedData={() => setReady(true)}
          style={{
            ...style,
            opacity: ready ? 1 : 0,
            transition: "opacity 0.2s ease-out",
          }}
          {...videoProps}
          preload={videoProps.preload ?? "metadata"}
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
  const src = getCacheBustedMediaUrl(url, version);

  return (
    <div className={containerClassName} style={{ background: "#0a0a0a", position: "relative" }}>
      <img
        key={src}
        src={src}
        alt={imgProps.alt ?? ""}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? "eager" : "lazy"}
        onLoad={() => setReady(true)}
        style={{
          ...style,
          opacity: ready ? 1 : 0,
          transition: "opacity 0.2s ease-out",
        }}
        {...imgProps}
      />
    </div>
  );
}
