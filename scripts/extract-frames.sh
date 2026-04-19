#!/bin/bash
# extract-frames.sh — Extract frames from brand video for scroll animation
#
# Usage:
#   ./scripts/extract-frames.sh path/to/brand-video.mp4
#
# Output: web/public/frames/frame-0001.jpg through frame-NNNN.jpg
# The ScrollVideoCanvas component reads from this directory.

set -euo pipefail

VIDEO_FILE="${1:-}"
FRAMES_DIR="web/public/frames"
FPS="${2:-18}"  # 18fps = ~360 frames for a 20s video

if [ -z "$VIDEO_FILE" ]; then
  echo "Usage: ./scripts/extract-frames.sh <video-file> [fps]"
  echo ""
  echo "  video-file  Path to the brand video (mp4/mov/webm)"
  echo "  fps         Frames per second to extract (default: 18)"
  echo ""
  echo "Example:"
  echo "  ./scripts/extract-frames.sh brand-video.mp4 18"
  exit 1
fi

if ! command -v ffmpeg &> /dev/null; then
  echo "Error: ffmpeg is not installed."
  echo "Install with: brew install ffmpeg"
  exit 1
fi

# Create output directory
mkdir -p "$FRAMES_DIR"

# Clear existing frames
rm -f "$FRAMES_DIR"/frame-*.jpg

echo "Extracting frames at ${FPS}fps from: $VIDEO_FILE"
echo "Output: $FRAMES_DIR/"

# Extract frames — 1920x1080, quality 75 (good balance of size/quality)
ffmpeg -i "$VIDEO_FILE" \
  -vf "fps=${FPS},scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0A1628" \
  -q:v 4 \
  "$FRAMES_DIR/frame-%04d.jpg" \
  -y -loglevel warning

FRAME_COUNT=$(ls -1 "$FRAMES_DIR"/frame-*.jpg 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "Done! Extracted $FRAME_COUNT frames."
echo ""
echo "Next steps:"
echo "  1. Update your landing page to use <ScrollVideoCanvas frameCount={$FRAME_COUNT} />"
echo "  2. Run: npm run dev"
echo "  3. Scroll through the hero section to see the animation"
echo ""
echo "Total frame size:"
du -sh "$FRAMES_DIR"
