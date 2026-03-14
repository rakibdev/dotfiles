source ~/Downloads/dotfiles/scripts/capture/utils.sh

usage() {
  echo "Usage: record [--selection] [--audio] [--help]"
}

if [[ "$1" == "--help" ]]; then usage; exit 0; fi

selection=false
audio=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --selection) selection=true; shift ;;
    --audio) audio=true; shift ;;
    *) error "Unknown argument: $1"; exit 1 ;;
  esac
done

if $selection; then selectArea; fi

recordFile="$(xdg-user-dir DOWNLOAD)/recording.mp4"
recording=true

stopRecording() {
  recording=false
  echo ""
  if killall --signal SIGINT wf-recorder &>/dev/null; then
    notify-send "Screen Recording" "Saved to $recordFile" --hint string:image-path:file://$recordFile
  else
    error "No screen record running."
  fi
}

cmd="yes | wf-recorder -f $recordFile"
if $selection; then cmd+=" -g \"$area\""; fi
if $audio; then
  src=$(pactl get-default-source)
  cmd+=" --audio=\"$src.monitor\""
fi
echo $cmd
cmd+=" &>/dev/null & disown"
eval $cmd

trap stopRecording EXIT

seconds=0
while $recording; do
  printf "\r${red}Recording screen %02d:%02d$colorOff" $((seconds/60)) $((seconds%60))
  sleep 1
  ((seconds++))
done
