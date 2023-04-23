time=$(date '+%I:%M')
today=$(date '+%A, %b %d')
volume=$(wpctl get-volume @DEFAULT_SINK@ | tr -d -c 0-9 | sed 's/^0//')

echo '{ "time":"'$time'", "today":"'$today'", "volume":"'$volume'" }'