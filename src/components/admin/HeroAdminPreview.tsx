"use client";

import { useMemo, useState } from "react";
import { Film } from "lucide-react";
import {
  heroPreviewMediaCandidates,
  heroPreviewPosterCandidates,
} from "@/lib/hero-preview-urls";
import type { PageHeroCmsSlug } from "@/lib/page-hero-cms-config";

type HeroAdminPreviewProps = {
  page: PageHeroCmsSlug;
  mediaType: "VIDEO" | "IMAGE";
  cmsPosterUrl?: string | null;
  cmsMediaUrl?: string | null;
  version?: number;
};

/**
 * Admin hero card preview — poster image first (merchandise pattern), then media fallbacks.
 */
export function HeroAdminPreview({
  page,
  mediaType,
  cmsPosterUrl,
  cmsMediaUrl,
  version = 0,
}: HeroAdminPreviewProps) {
  const posterCandidates = useMemo(
    () => heroPreviewPosterCandidates(page, cmsPosterUrl),
    [page, cmsPosterUrl]
  );
  const mediaCandidates = useMemo(
    () => heroPreviewMediaCandidates(page, cmsMediaUrl),
    [page, cmsMediaUrl]
  );

  const [posterIndex, setPosterIndex] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [videoReady, setVideoReady] = useState(false);

  const posterSrc = posterCandidates[posterIndex] ?? null;
  const mediaSrc = mediaCandidates[mediaIndex] ?? null;

  if (mediaType === "IMAGE") {
    const src = cmsMediaUrl ?? mediaSrc ?? posterSrc;
    if (!src) {
      return (
        <div className="flex h-full items-center justify-center text-white/30">
          <Film className="h-10 w-10" />
        </div>
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={`${page}-img-${src}-${version}`}
        src={src}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setMediaIndex((i) => Math.min(i + 1, mediaCandidates.length - 1))}
      />
    );
  }

  return (
    <div className="relative h-full w-full bg-black/40">
      {posterSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${page}-poster-${posterSrc}-${version}`}
          src={posterSrc}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            videoReady ? "opacity-0" : "opacity-100"
          }`}
          onError={() =>
            setPosterIndex((i) => {
              const next = i + 1;
              return next < posterCandidates.length ? next : i;
            })
          }
        />
      ) : null}
      {mediaSrc ? (
        <video
          key={`${page}-vid-${mediaSrc}-${version}`}
          src={mediaSrc}
          muted
          playsInline
          preload="metadata"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
          onLoadedData={() => setVideoReady(true)}
          onError={() =>
            setMediaIndex((i) => {
              const next = i + 1;
              return next < mediaCandidates.length ? next : i;
            })
          }
        />
      ) : null}
      {!posterSrc && !mediaSrc ? (
        <div className="flex h-full items-center justify-center text-white/30">
          <Film className="h-10 w-10" />
        </div>
      ) : null}
    </div>
  );
}
