#!/usr/bin/env bash
# Build web-friendly Products hero MP4 + WebP poster (local assets).
# Source: public/videos/hero/Products-SilverKing.source.mp4 (gitignored if large).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/videos/hero/Products-SilverKing.source.mp4"
OUT="$ROOT/public/videos/hero/Products-SilverKing.mp4"
POSTER="$ROOT/public/images/products/products-hero-poster.webp"
mkdir -p "$(dirname "$POSTER")"

if [[ ! -f "$SRC" ]]; then
  echo "Missing source video: $SRC" >&2
  exit 1
fi

ffmpeg -y -i "$SRC" -an \
  -vf "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease,format=yuv420p" \
  -c:v libx264 -profile:v high -preset slow -crf 23 -movflags +faststart \
  "$OUT"

ffmpeg -y -ss 00:00:02 -i "$OUT" -frames:v 1 \
  -vf "scale=1280:-2:flags=lanczos" \
  -c:v libwebp -quality 88 -compression_level 4 \
  "$POSTER"

echo "Wrote $OUT and $POSTER — bump PRODUCTS_HERO_VIDEO_ASSET_VERSION then npm run r2:sync"
