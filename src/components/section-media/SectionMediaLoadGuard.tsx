"use client";

import { forwardRef, useState } from "react";
import { getCacheBustedMediaUrl } from "@/hooks/usePageSections";

type VideoGuardProps = Omit<React.ComponentPropsWithoutRef<"video">, "src"> & {
  url: string;
  version?: number;
  containerClassName?: string;
};

type ImageGuardProps = Omit<React.ComponentPropsWithoutRef<"img">, "src"> & {
  url: string;
  version?: number;
  containerClassName?: string;
};

/**
 * Renders video with black background; video only becomes visible after onLoadedData.
 * Cache-busts URL with version so browser never serves stale file (stability between old/new asset).
 */
export const VideoLoadGuard = forwardRef<HTMLVideoElement, VideoGuardProps>(
  function VideoLoadGuard({ url, version, containerClassName = "", style, ...videoProps }, ref) {
    const [ready, setReady] = useState(false);
    const src = getCacheBustedMediaUrl(url, version);

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
  ...imgProps
}: ImageGuardProps) {
  const [ready, setReady] = useState(false);
  const src = getCacheBustedMediaUrl(url, version);

  return (
    <div className={containerClassName} style={{ background: "#0a0a0a", position: "relative" }}>
      <img
        key={src}
        src={src}
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
