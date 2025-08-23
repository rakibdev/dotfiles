# Convert and compress video to MP4
# Uses libx264 (not 265) for Chromium compatibility
# Added scale filter to fix odd width (libx264 requires even dimensions)
for inputFile in "$@"; do
  filename=${inputFile##*/}
  echo "Compressing $filename"
  originalSize=$(du -h "$inputFile" | cut -f1)
  ffmpeg -hide_banner -loglevel error -i "$inputFile" -vf "scale=-2:1080" -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 250k "${inputFile%.*}-output.mp4"
  newSize=$(du -h "${inputFile%.*}-output.mp4" | cut -f1)
  echo "Compressed $originalSize → $newSize"
done