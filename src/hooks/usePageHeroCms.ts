"use client";

import { useMemo } from "react";
import { usePageSections, getCacheBustedMediaUrl } from "@/hooks/usePageSections";
import {
  PAGE_HERO_CMS_CONFIG,
  HERO_POSTER_SECTION_KEY,
  type PageHeroCmsSlug,
} from "@/lib/page-hero-cms-config";
import { getR2UrlClient } from "@/utils/r2-url";
import { proxiedHeroVideoSrc } from "@/utils/hero-video-url";

/**
 * CMS hero media — resolve a single source before attaching video.
 * Poster shows immediately; video src waits until CMS fetch completes so the
 * built-in fallback never plays when a CMS override exists.
 */
export function usePageHeroCms(page: PageHeroCmsSlug) {
  const config = PAGE_HERO_CMS_CONFIG[page];

  const staticMediaUrl = useMemo(() => {
    if (config.mediaType === "IMAGE" && config.imagePath) {
      return getR2UrlClient(config.imagePath);
    }
    return config.videoPath ? getR2UrlClient(config.videoPath) : "";
  }, [config]);

  const staticPosterUrl = useMemo(
    () => getR2UrlClient(config.posterPath),
    [config.posterPath]
  );

  const staticVideoPlayUrl = useMemo(
    () =>
      config.mediaType === "VIDEO" && staticMediaUrl
        ? proxiedHeroVideoSrc(staticMediaUrl)
        : "",
    [config.mediaType, staticMediaUrl]
  );

  const { sections: pageSections, loading: cmsLoading } = usePageSections(page);

  const cmsHero = pageSections.hero;
  const cmsPoster = pageSections[HERO_POSTER_SECTION_KEY];
  const cmsResolved = !cmsLoading;

  const heroMediaType = (cmsHero?.mediaType?.toUpperCase() ??
    config.mediaType) as "VIDEO" | "IMAGE";

  const cmsActive = Boolean(cmsHero?.url);

  const heroMediaUrl = useMemo(() => {
    if (!cmsResolved) return staticMediaUrl;
    return cmsHero?.url ?? staticMediaUrl;
  }, [cmsResolved, cmsHero?.url, staticMediaUrl]);

  const heroPosterUrl = useMemo(() => {
    if (heroMediaType === "IMAGE" && heroMediaUrl) {
      return getCacheBustedMediaUrl(heroMediaUrl, cmsHero?.version ?? config.assetVersion);
    }
    const posterBase = cmsResolved
      ? (cmsPoster?.url ?? staticPosterUrl)
      : staticPosterUrl;
    const posterVersion = cmsPoster?.version ?? cmsHero?.version ?? config.assetVersion;
    return getCacheBustedMediaUrl(posterBase, posterVersion);
  }, [
    heroMediaType,
    heroMediaUrl,
    cmsResolved,
    cmsPoster?.url,
    cmsPoster?.version,
    cmsHero?.version,
    staticPosterUrl,
    config.assetVersion,
  ]);

  const heroVideoPlayUrl = useMemo(() => {
    if (heroMediaType !== "VIDEO") return "";
    if (!cmsResolved) return "";
    const url = cmsHero?.url ?? staticMediaUrl;
    return url ? proxiedHeroVideoSrc(url) : staticVideoPlayUrl;
  }, [heroMediaType, cmsResolved, cmsHero?.url, staticMediaUrl, staticVideoPlayUrl]);

  const heroVersion = cmsHero?.url ? cmsHero.version : config.assetVersion;
  const posterVersion = cmsPoster?.url
    ? cmsPoster.version
    : cmsHero?.url
      ? cmsHero.version
      : config.assetVersion;

  return {
    heroMediaType,
    heroMediaUrl,
    heroPosterUrl,
    heroVideoPlayUrl,
    heroVersion,
    posterVersion,
    cmsActive,
    cmsResolved,
    config,
  };
}
