# Reload device.
sudo modprobe -r v4l2loopback &> /dev/null
# Chromium doesn't detect the device without exclusive_caps=1.
sudo modprobe v4l2loopback card_label="Android Webcam" exclusive_caps=1

device=$(ls /dev/video* | head -n 1)
echo "Device: $device"
echo "Resolution: 640"

scrcpy --video-source=camera --camera-facing=back -m640 --v4l2-sink=$device --no-audio --no-playback
