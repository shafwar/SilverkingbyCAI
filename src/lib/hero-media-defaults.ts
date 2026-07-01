import type { CSSProperties } from "react";

/** Same-origin poster — always available on first paint (merchandise pattern). */
export const DEFAULT_HERO_POSTER = "/images/hero-fallback.jpg";

/** Visible hero placeholder while CMS/R2 media loads — never pure black. */
export const HERO_PLACEHOLDER_BG =
  "linear-gradient(180deg, #080808 0%, #050505 50%, #030303 100%), radial-gradient(ellipse 80% 60% at 50% 40%, rgba(212,175,55,0.05) 0%, transparent 55%)";

/**
 * Home hero vignette — pure CSS overlay (no JS). Darkens edges + left for headline readability.
 */
export const HOME_HERO_VIGNETTE_BG = [
  "linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.18) 48%, transparent 76%)",
  "linear-gradient(180deg, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.14) 42%, rgba(0,0,0,0.4) 68%, rgba(0,0,0,0.78) 100%)",
].join(", ");

/** CMS poster or same-origin fallback — merchandise first-paint pattern. */
export function resolveHeroPoster(cmsPosterUrl?: string | null): string {
  const trimmed = cmsPosterUrl?.trim();
  return trimmed ? trimmed : DEFAULT_HERO_POSTER;
}

/** Standard non-interactive hero video styles (merchandise). */
export const HERO_VIDEO_POINTER_STYLE: CSSProperties = {
  pointerEvents: "none",
  outline: "none",
  WebkitTapHighlightColor: "transparent",
  WebkitTouchCallout: "none",
  userSelect: "none",
};

export const HERO_VIDEO_COVER_STYLE: CSSProperties = {
  objectFit: "cover",
  objectPosition: "center center",
  width: "100%",
  height: "100%",
};

/** GPU-friendly hero shell (merchandise hero wrapper). */
export const HERO_MEDIA_SHELL_STYLE: CSSProperties = {
  transform: "translateZ(0)",
  WebkitBackfaceVisibility: "hidden",
};

/** Above-the-fold hero video — full merchandise hero props (spread onto VideoLoadGuard). */
export const HERO_VIDEO_MERCH_PATTERN = {
  posterPriority: true as const,
  lcpFriendlyPoster: true as const,
  optimizeGpu: true as const,
  lightVideoFade: true as const,
  preload: "auto" as const,
};

/** Below-the-fold footer / section video — merchandise footer pattern. */
export const FOOTER_VIDEO_MERCH_PATTERN = {
  lazyAttach: true as const,
  deferAttachUntilIdle: true as const,
  idleAttachTimeoutMs: 720,
  lcpFriendlyPoster: true as const,
  optimizeGpu: true as const,
  lightVideoFade: true as const,
  preload: "none" as const,
};

/** Inline card / secondary video — poster visible, lazy attach. */
export const SECTION_VIDEO_MERCH_PATTERN = {
  lazyAttach: true as const,
  lcpFriendlyPoster: true as const,
  optimizeGpu: true as const,
  lightVideoFade: true as const,
  preload: "none" as const,
};
