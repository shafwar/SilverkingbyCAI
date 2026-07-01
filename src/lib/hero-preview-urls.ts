import { DEFAULT_HERO_POSTER } from "@/lib/hero-media-defaults";
import {
  PAGE_HERO_CMS_CONFIG,
  type PageHeroCmsSlug,
} from "@/lib/page-hero-cms-config";
import { getR2UrlClient } from "@/utils/r2-url";
import { proxiedHeroVideoSrc } from "@/utils/hero-video-url";

function uniqueUrls(urls: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const t = u?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Poster candidates for admin preview — same-origin before R2 when bundled in deploy. */
export function heroPreviewPosterCandidates(
  slug: PageHeroCmsSlug,
  cmsPosterUrl?: string | null
): string[] {
  const cfg = PAGE_HERO_CMS_CONFIG[slug];
  const localPoster = cfg.posterPath.startsWith("/") ? cfg.posterPath : `/${cfg.posterPath}`;
  return uniqueUrls([
    cmsPosterUrl,
    localPoster,
    getR2UrlClient(cfg.posterPath),
    DEFAULT_HERO_POSTER,
  ]);
}

/** Video/image candidates for admin preview. */
export function heroPreviewMediaCandidates(
  slug: PageHeroCmsSlug,
  cmsMediaUrl?: string | null
): string[] {
  const cfg = PAGE_HERO_CMS_CONFIG[slug];
  const localPath =
    cfg.mediaType === "IMAGE" && cfg.imagePath
      ? cfg.imagePath
      : cfg.videoPath;
  const local = localPath?.startsWith("/") ? localPath : localPath ? `/${localPath}` : null;
  const r2 = localPath ? getR2UrlClient(localPath) : null;
  const proxiedR2 = r2 && cfg.mediaType === "VIDEO" ? proxiedHeroVideoSrc(r2) : r2;

  return uniqueUrls([
    cmsMediaUrl,
    local,
    proxiedR2 ?? r2,
    cmsMediaUrl && cfg.mediaType === "VIDEO" ? proxiedHeroVideoSrc(cmsMediaUrl) : cmsMediaUrl,
  ]);
}
