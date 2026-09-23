"use client";

import { useMemo, useState } from "react";
import { Film } from "lucide-react";
import { heroPreviewPosterCandidates } from "@/lib/hero-preview-urls";
import type { PageHeroCmsSlug } from "@/lib/page-hero-cms-config";

type HeroAdminPreviewProps = {
  page: PageHeroCmsSlug;
  mediaType: "VIDEO" | "IMAGE";
  cmsPosterUrl?: string | null;
  cmsMediaUrl?: string | null;
  version?: number;
};

/**
 * Admin hero card preview — poster image only (no video decode in the grid).
 * Matches the merchandise first-paint pattern: WebP poster loads instantly from deploy.
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

  const [posterIndex, setPosterIndex] = useState(0);
  const posterSrc = posterCandidates[posterIndex] ?? null;

  if (mediaType === "IMAGE") {
    const src = cmsMediaUrl ?? posterSrc;
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
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="h-full w-full object-cover"
        onError={() =>
          setPosterIndex((i) => Math.min(i + 1, posterCandidates.length - 1))
        }
      />
    );
  }

  if (!posterSrc) {
    return (
      <div className="flex h-full items-center justify-center text-white/30">
        <Film className="h-10 w-10" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={`${page}-poster-${posterSrc}-${version}`}
      src={posterSrc}
      alt=""
      loading="eager"
      fetchPriority="high"
      decoding="async"
      className="h-full w-full object-cover"
      onError={() =>
        setPosterIndex((i) => {
          const next = i + 1;
          return next < posterCandidates.length ? next : i;
        })
      }
    />
  );
}
