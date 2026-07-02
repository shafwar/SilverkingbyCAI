/**
 * Site-wide hero CMS standards — Merchandise is the reference implementation.
 *
 * Published video target: ~15s loop, ~5–6 MB, 1080p H.264, faststart, WebP poster.
 * (See public/videos/hero/merchandise-hero.mp4 + scripts/build-merchandise-hero-video.sh)
 */

export const HERO_CMS_VIDEO = {
  /** Max raw upload duration (seconds). */
  maxInputDurationSeconds: 60,
  /** Published hero length (seconds). Longer sources are trimmed from the start. */
  publishDurationSeconds: 15,
  /** Prefer stopping CRF passes once output is at or below this (merchandise ≈ 5.7 MB). */
  idealOutputBytes: 6 * 1024 * 1024,
  /** Hard reject if still above after all CRF passes. */
  maxOutputBytes: 8 * 1024 * 1024,
  maxWidth: 1920,
  /** Merchandise build uses CRF 22; CMS steps up if needed. */
  crfSteps: [22, 24, 26, 28] as const,
  preset: "fast" as const,
  ffmpegTimeoutMs: 300_000,
} as const;

export const HERO_CMS_IMAGE = {
  maxInputBytes: 25 * 1024 * 1024,
  maxOutputBytes: 8 * 1024 * 1024,
  maxWidth: 2400,
  quality: 90,
  /** WebP poster extracted from hero video (merchandise build uses 84). */
  posterQuality: 84,
  posterMaxWidth: 1920,
} as const;
