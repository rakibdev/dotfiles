switch_audio_sink() {
    current_sink=$(pactl get-default-sink)
    available_sinks=$(pactl list short sinks | cut -f 2)
    for sink in $available_sinks; do
        [ -z "$first_sink" ] && first_sink=$sink
        if [ "$sink" == "$current_sink" ]; then
            next=1
            elif [ -n "$next"  ]; then
            new_sink=$sink
            break
        fi
    done
    [ -z "$new_sink" ] && new_sink=$first_sink
    pactl set-default-sink "$new_sink"
}

if [ "$1" == "volume-up" ]; then wpctl -l 1 set-volume @DEFAULT_SINK@ 10%+; fi
if [ "$1" == "volume-down" ]; then wpctl set-volume @DEFAULT_SINK@ 10%-; fi
if [ "$1" == "switch-audio-sink" ]; then switch_audio_sink; fi