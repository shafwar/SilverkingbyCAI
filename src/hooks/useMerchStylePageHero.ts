"use client";

import { useEffect, useMemo, useState } from "react";
import { usePageSections } from "@/hooks/usePageSections";
import { usePageMedia } from "@/hooks/usePageMedia";
import { DEFAULT_HERO_POSTER, resolveHeroPoster } from "@/lib/hero-media-defaults";
import { PAGE_HERO_DEFAULTS, type PageHeroSlug } from "@/lib/page-hero-defaults";
import { getR2UrlClient } from "@/utils/r2-url";
import { proxiedHeroVideoSrc } from "@/utils/hero-video-url";

type MerchHeroOptions = {
  /** Server-provided instant hero (journal, distributor). */
  initialHeroUrl?: string;
  initialHeroMediaType?: "VIDEO" | "IMAGE";
};

const CMS_DEFER_MAX_MS = 1400;
const CMS_DEFER_IDLE_TIMEOUT_MS = 2600;

/**
 * Merchandise-style page hero: static video/poster on first paint;
 * CMS page-sections + page-media fetch deferred (idle) so hero never waits on API.
 */
export function useMerchStylePageHero(page: PageHeroSlug, options?: MerchHeroOptions) {
  const config = PAGE_HERO_DEFAULTS[page];
  const [cmsEnabled, setCmsEnabled] = useState(false);

  const staticVideoUrl = useMemo(
    () => (config.videoPath ? getR2UrlClient(config.videoPath) : null),
    [config.videoPath]
  );
  const staticImageUrl = useMemo(
    () => (config.imagePath ? getR2UrlClient(config.imagePath) : null),
    [config.imagePath]
  );
  const staticFooterVideoUrl = useMemo(
    () => (config.footerVideoPath ? getR2UrlClient(config.footerVideoPath) : null),
    [config.footerVideoPath]
  );
  const staticPosterUrl = useMemo(
    () => (config.posterPath ? getR2UrlClient(config.posterPath) : DEFAULT_HERO_POSTER),
    [config.posterPath]
  );
  const staticVideoPlayUrl = useMemo(
    () => (staticVideoUrl ? proxiedHeroVideoSrc(staticVideoUrl) : null),
    [staticVideoUrl]
  );
  const staticFooterVideoPlayUrl = useMemo(
    () => (staticFooterVideoUrl ? proxiedHeroVideoSrc(staticFooterVideoUrl) : null),
    [staticFooterVideoUrl]
  );

  const instantHeroMediaType = options?.initialHeroMediaType ?? config.mediaType;

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

  const { sections: pageSections, refetch: refetchPageSections } = usePageSections(page, {
    enabled: cmsEnabled,
  });
  const { data: pageMedia, refetch: refetchPageMedia } = usePageMedia(page, {
    enabled: cmsEnabled,
  });

  const cmsHero = pageSections.hero;
  const heroMediaType = (cmsHero?.mediaType?.toUpperCase() ??
    instantHeroMediaType) as "VIDEO" | "IMAGE";

  const heroMediaUrl =
    cmsHero?.url ??
    options?.initialHeroUrl ??
    (instantHeroMediaType === "IMAGE" ? staticImageUrl : staticVideoUrl) ??
    "";

  const heroVideoPlayUrl = useMemo(() => {
    if (heroMediaType !== "VIDEO" || !heroMediaUrl) {
      return staticVideoPlayUrl ?? options?.initialHeroUrl ?? "";
    }
    if (heroMediaUrl.startsWith("/videos/") || heroMediaUrl.startsWith("/images/")) {
      return heroMediaUrl;
    }
    return proxiedHeroVideoSrc(heroMediaUrl);
  }, [heroMediaType, heroMediaUrl, staticVideoPlayUrl, options?.initialHeroUrl]);

  const heroPosterUrl = useMemo(() => {
    if (heroMediaType === "IMAGE" && heroMediaUrl) return heroMediaUrl;
    return resolveHeroPoster(pageMedia?.heroImageUrl ?? staticPosterUrl);
  }, [heroMediaType, heroMediaUrl, pageMedia?.heroImageUrl, staticPosterUrl]);

  const heroVersion = cmsHero?.url ? cmsHero.version : config.assetVersion;

  const cmsFooter = pageSections.section_footer_video;
  const footerMediaType = (cmsFooter?.mediaType?.toUpperCase() ?? "VIDEO") as "VIDEO" | "IMAGE";
  const footerMediaUrl =
    cmsFooter?.url ?? staticFooterVideoUrl ?? staticVideoUrl ?? heroMediaUrl;
  const footerVideoPlayUrl = useMemo(
    () => (footerMediaUrl ? proxiedHeroVideoSrc(footerMediaUrl) : staticFooterVideoPlayUrl ?? ""),
    [footerMediaUrl, staticFooterVideoPlayUrl]
  );
  const footerVersion = cmsFooter?.url ? cmsFooter.version : config.assetVersion;

  const refetchHero = async () => {
    setCmsEnabled(true);
    await Promise.all([refetchPageSections(), refetchPageMedia()]);
  };

  return {
    pageSections,
    pageMedia,
    cmsEnabled,
    heroMediaType,
    heroMediaUrl,
    heroVideoPlayUrl,
    heroPosterUrl,
    heroVersion,
    footerMediaType,
    footerMediaUrl,
    footerVideoPlayUrl,
    footerVersion,
    refetchPageSections: refetchHero,
  };
}
