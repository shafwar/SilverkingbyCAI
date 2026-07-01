"use client";

import { useEffect, useMemo, useState } from "react";
import { usePageSections, getCacheBustedMediaUrl } from "@/hooks/usePageSections";
import {
  PAGE_HERO_CMS_CONFIG,
  HERO_POSTER_SECTION_KEY,
  type PageHeroCmsSlug,
} from "@/lib/page-hero-cms-config";
import { getR2UrlClient } from "@/utils/r2-url";
import { proxiedHeroVideoSrc } from "@/utils/hero-video-url";

const CMS_DEFER_MAX_MS = 1400;
const CMS_DEFER_IDLE_TIMEOUT_MS = 2600;

/**
 * Merchandise pattern: static poster + media on first paint;
 * optional CMS override after idle (single swap, cache-busted by version).
 */
export function usePageHeroCms(page: PageHeroCmsSlug) {
  const config = PAGE_HERO_CMS_CONFIG[page];
  const [cmsEnabled, setCmsEnabled] = useState(false);

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

  useEffect(() => {
    const w = typeof window !== "undefined" ? window : null;
    if (!w) return;
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setCmsEnabled(true);
    };
    const t = w.setTimeout(enable, CMS_DEFER_MAX_MS);
    let idleId: number | undefined;
    const ric = w.requestIdleCallback?.bind(w);
    if (ric) {
      idleId = ric(enable, { timeout: CMS_DEFER_IDLE_TIMEOUT_MS });
    } else {
      w.setTimeout(enable, 0);
    }
    return () => {
      cancelled = true;
      w.clearTimeout(t);
      if (idleId != null) w.cancelIdleCallback(idleId);
    };
  }, []);

  const { sections: pageSections } = usePageSections(page, { enabled: cmsEnabled });

  const cmsHero = pageSections.hero;
  const cmsPoster = pageSections[HERO_POSTER_SECTION_KEY];

  const heroMediaType = (cmsHero?.mediaType?.toUpperCase() ??
    config.mediaType) as "VIDEO" | "IMAGE";

  const heroMediaUrl = cmsHero?.url ?? staticMediaUrl;

  const heroPosterUrl = useMemo(() => {
    if (heroMediaType === "IMAGE" && heroMediaUrl) {
      return getCacheBustedMediaUrl(heroMediaUrl, cmsHero?.version ?? config.assetVersion);
    }
    const posterBase = cmsPoster?.url ?? staticPosterUrl;
    const posterVersion = cmsPoster?.version ?? cmsHero?.version ?? config.assetVersion;
    return getCacheBustedMediaUrl(posterBase, posterVersion);
  }, [
    heroMediaType,
    heroMediaUrl,
    cmsPoster?.url,
    cmsPoster?.version,
    cmsHero?.version,
    staticPosterUrl,
    config.assetVersion,
  ]);

  const heroVideoPlayUrl = useMemo(() => {
    if (heroMediaType !== "VIDEO" || !heroMediaUrl) return staticVideoPlayUrl;
    return proxiedHeroVideoSrc(heroMediaUrl);
  }, [heroMediaType, heroMediaUrl, staticVideoPlayUrl]);

  const heroVersion = cmsHero?.url ? cmsHero.version : config.assetVersion;
  const posterVersion = cmsPoster?.url
    ? cmsPoster.version
    : cmsHero?.url
      ? cmsHero.version
      : config.assetVersion;

  const cmsActive = Boolean(cmsHero?.url);

  return {
    heroMediaType,
    heroMediaUrl,
    heroPosterUrl,
    heroVideoPlayUrl,
    heroVersion,
    posterVersion,
    cmsActive,
    config,
  };
}
