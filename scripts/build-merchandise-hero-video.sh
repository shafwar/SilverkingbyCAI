#!/usr/bin/env bash
# Build 15s 1080p loop-friendly merchandise hero + WebP poster (local assets).
# Output matches HERO_CMS_VIDEO in src/lib/hero-cms-spec.ts (~15s, ~5–6 MB).
# Source: public/videos/hero/VIDEO MERCHANDISE SILVER KING.mp4 (gitignored if large).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/videos/hero/VIDEO MERCHANDISE SILVER KING.mp4"
OUT="$ROOT/public/videos/hero/merchandise-hero.mp4"
POSTER="$ROOT/public/images/merchandise/merch-hero-poster.webp"
mkdir -p "$(dirname "$POSTER")"

if [[ ! -f "$SRC" ]]; then
  echo "Missing source video: $SRC" >&2
  exit 1
fi

ffmpeg -y -i "$SRC" -t 15 -an \
  -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease,format=yuv420p" \
  -c:v libx264 -profile:v high -preset slow -crf 22 -movflags +faststart \
  "$OUT"

ffmpeg -y -ss 00:00:01 -i "$OUT" -frames:v 1 -c:v libwebp -quality 84 "$POSTER"

echo "Wrote $OUT and $POSTER — bump MERCH_HERO_VIDEO_ASSET_VERSION then npm run merchandise:upload-hero-video"
