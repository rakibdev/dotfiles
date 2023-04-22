time=$(date '+%I:%M')
today=$(date '+%A, %b %d')
volume=$(amixer sget Master | grep 'Front Left:' | awk -F'[][]' '{ print $2 }')

echo '{ "time":"'$time'", "today":"'$today'", "volume":"'$volume'" }'