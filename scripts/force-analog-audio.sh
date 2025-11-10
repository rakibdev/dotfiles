# PipeWire doesn't detect Y Splitter
pactl set-card-profile alsa_card.pci-0000_07_00.6 output:analog-stereo+input:analog-stereo
amixer -c 1 sset 'Headphone' 100% unmute