cancel () {
    echo '{ "label": "" }'
    exit 0
}

player_id=$(dbus-send --print-reply --dest=org.freedesktop.DBus  /org/freedesktop/DBus org.freedesktop.DBus.ListNames | grep -oP 'org.mpris.MediaPlayer2.*' | sed 's/"//')
if [ -z "$player_id" ]; then cancel; fi

bus="dbus-send --print-reply --dest=$player_id /org/mpris/MediaPlayer2"
interface='org.mpris.MediaPlayer2.Player'
properties="$bus org.freedesktop.DBus.Properties.Get string:$interface"
metadata=$(eval "$properties string:Metadata")
track_id=$(echo $metadata | pcregrep -o1 'mpris:trackid" variant object path "(\S+)"')
title=$(echo $metadata | pcregrep -o1 'xesam:title" variant string "(.*)"')
title="${title//\"/\\\"}" # escape double quotes
art_url=$(echo $metadata | pcregrep -o1 'xesam:title" variant string "(.*)"')
duration=$(echo $metadata | pcregrep -o1 'mpris:length" variant int64 (\d+)')
status=$(eval "$properties string:PlaybackStatus" | pcregrep -o1 '"(\w+)"$')

action=$1
if [ "$action" == "play-pause" ]; then
    if [ "$status" == "Playing" ]; then action="pause"; else action="play"; fi
fi
if [ "$action" == "next" ]; then eval "$bus $interface.Next >/dev/null"; fi
if [ "$action" == "previous" ]; then eval "$bus $interface.Previous >/dev/null"; fi
if [ "$action" == "play" ]; then eval "$bus $interface.Play >/dev/null"; fi
if [ "$action" == "pause" ]; then eval "$bus $interface.Pause >/dev/null"; fi
if [ "$action" == "progress" ]; then
    percent=$2
    microseconds=$(( ($percent * $duration) / 100 ))
    eval "$bus $interface.SetPosition objpath:'$track_id' int64:$microseconds >/dev/null"
fi

# firefox doesn't support position. https://bugzilla.mozilla.org/show_bug.cgi?id=1659199
# position=$(eval "$properties string:Position" | pcregrep -o1 '\s(\d+)$ ')
# if [[ $position -gt 1 ]] then
#     progress=$((($position * 100) / $duration))
# fi

echo '{ "label":"'"$title"'", "status":"'$status'", "progress":'${progress:=0}' }'