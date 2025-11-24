#!/bin/bash

# Video Compression Script with Quality Preservation
# This script compresses videos using FFmpeg with CRF encoding
# to reduce file size while maintaining visual quality

set -e  # Exit on error

VIDEO_DIR="public/videos/hero"
BACKUP_DIR="public/videos/hero/backup_$(date +%Y%m%d_%H%M%S)"
TEMP_DIR="public/videos/hero/temp_compress"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Video Compression Script ===${NC}"
echo ""

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}Error: FFmpeg is not installed.${NC}"
    echo "Please install FFmpeg first: brew install ffmpeg"
    exit 1
fi

# Create backup directory
echo -e "${YELLOW}Creating backup directory...${NC}"
mkdir -p "$BACKUP_DIR"

# Create temp directory
mkdir -p "$TEMP_DIR"

# Function to get file size in MB
get_size_mb() {
    local file="$1"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        stat -f%z "$file" 2>/dev/null | awk '{printf "%.2f", $1/1024/1024}' || echo "0"
    else
        # Linux
        stat -c%s "$file" 2>/dev/null | awk '{printf "%.2f", $1/1024/1024}' || echo "0"
    fi
}

# Function to compress video
compress_video() {
    local input_file="$1"
    local filename=$(basename "$input_file")
    local output_file="$TEMP_DIR/$filename"
    
    echo ""
    echo -e "${YELLOW}Processing: $filename${NC}"
    
    # Get original size
    local original_size=$(get_size_mb "$input_file")
    echo "  Original size: ${original_size} MB"
    
    # Compress with FFmpeg using CRF (Constant Rate Factor)
    # CRF 22 = Good quality, better compression (optimal for web)
    # CRF 20 = High quality, good compression
    # Using CRF 22 for optimal balance between quality and file size
    # Preset medium for faster encoding while maintaining quality
    
    echo "  Compressing with FFmpeg (CRF 22, preset medium)..."
    
    # First, try to detect if video is already well-compressed
    # If bitrate is low, use CRF 22, otherwise use CRF 23
    local bitrate=$(ffprobe -v error -select_streams v:0 -show_entries stream=bit_rate -of default=noprint_wrappers=1:nokey=1 "$input_file" 2>/dev/null | head -1)
    local crf_value="22"
    
    if [ -n "$bitrate" ] && [ "$bitrate" != "N/A" ]; then
        # If bitrate is very high (> 10Mbps), use slightly higher CRF
        if [ "$bitrate" -gt 10000000 ]; then
            crf_value="23"
            echo "  Detected high bitrate, using CRF 23 for better compression"
        fi
    fi
    
    ffmpeg -i "$input_file" \
        -c:v libx264 \
        -crf "$crf_value" \
        -preset medium \
        -profile:v high \
        -level 4.0 \
        -c:a aac \
        -b:a 128k \
        -movflags +faststart \
        -pix_fmt yuv420p \
        -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease" \
        -y \
        "$output_file" 2>&1 | grep -E "(Duration|Stream|Output|error|frame)" || true
    
    if [ ! -f "$output_file" ]; then
        echo -e "${RED}  Error: Compression failed for $filename${NC}"
        return 1
    fi
    
    # Get compressed size
    local compressed_size=$(get_size_mb "$output_file")
    echo "  Compressed size: ${compressed_size} MB"
    
    # Calculate reduction
    local reduction=$(echo "$original_size - $compressed_size" | bc 2>/dev/null || echo "0")
    local reduction_percent=$(echo "scale=1; ($reduction / $original_size) * 100" | bc 2>/dev/null || echo "0")
    
    echo "  Size reduction: ${reduction} MB (${reduction_percent}%)"
    
    # Only replace if compressed file is smaller (using awk for comparison if bc fails)
    local is_smaller=$(awk -v orig="$original_size" -v comp="$compressed_size" 'BEGIN {print (comp < orig)}')
    if [ "$is_smaller" = "1" ]; then
        echo -e "${GREEN}  ✓ Compression successful, replacing original${NC}"
        
        # Backup original
        cp "$input_file" "$BACKUP_DIR/$filename"
        
        # Replace with compressed version
        mv "$output_file" "$input_file"
        
        return 0
    else
        echo -e "${YELLOW}  ⚠ Compressed file is larger, keeping original${NC}"
        rm -f "$output_file"
        return 1
    fi
}

# Process all MP4 files in hero directory
echo -e "${YELLOW}Finding video files...${NC}"

# Find only valid MP4 files (must end with .mp4 and be a regular file)
video_files=()
while IFS= read -r -d '' file; do
    if [[ -f "$file" && "$file" == *.mp4 ]]; then
        video_files+=("$file")
    fi
done < <(find "$VIDEO_DIR" -maxdepth 1 -name "*.mp4" -type f -print0 2>/dev/null | sort -z)

if [ ${#video_files[@]} -eq 0 ]; then
    echo -e "${RED}No valid video files found in $VIDEO_DIR${NC}"
    exit 1
fi

echo "Found ${#video_files[@]} video file(s)"
echo ""

# Process each video
success_count=0
skip_count=0
error_count=0

for video_file in "${video_files[@]}"; do
    # Validate file exists and is readable
    if [[ ! -f "$video_file" || ! -r "$video_file" ]]; then
        echo -e "${RED}  Skipping invalid file: $video_file${NC}"
        ((error_count++))
        continue
    fi
    
    if compress_video "$video_file"; then
        ((success_count++))
    else
        ((skip_count++))
    fi
done

# Cleanup temp directory
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}=== Compression Complete ===${NC}"
echo "  Successfully compressed: $success_count"
echo "  Skipped (no improvement): $skip_count"
if [ $error_count -gt 0 ]; then
    echo "  Errors: $error_count"
fi
echo "  Backup location: $BACKUP_DIR"
echo ""
if [ $success_count -gt 0 ]; then
    echo -e "${GREEN}✓ Videos have been optimized while maintaining visual quality!${NC}"
else
    echo -e "${YELLOW}⚠ No videos were compressed (all were already optimal or errors occurred)${NC}"
fi

