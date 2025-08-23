set -e

file="/tmp/mic_test.wav"

echo "Recording..."
arecord -f cd -t wav -d 2 "$file" 2>/dev/null

echo "Playing..."
aplay "$file" 2>/dev/null

rm -f "$file"

echo "Done!"
