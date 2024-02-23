source ~/Downloads/apps-script/utils.sh

usage() {
  info "Usage:"
  echo "  $0 {type} {options}"
  info "Type:"
  echo -e "  screenshot $grey(default)$reset"
  echo "  video"
  info "Options:"
  echo "  --selection"
  echo "  --audio"
  echo "  --help"
}
if [[ "$1" == "--help" ]]; then
  usage
  exit 0
fi

video=false
selection=false
audio=false
while [[ $# -gt 0 ]]; do 
  case $1 in
    screenshot) shift ;;
    video) video=true; shift ;;
    --selection) selection=true; shift ;;
    --audio) audio=true; shift ;;
    *)
      error "Unknown argument: $1";
      exit 1;;
  esac
done

selectArea() {
  local appData=~/.config/system-ui/app-data.json
  local color=$(grep -oP '(?<="primary_40":")[^"]+' $appData)
  area=$(slurp -b "${color}40" -w 0)
}

recording=true
recordFile="/tmp/recording.mp4"
stopRecording() {
  recording=false
  echo ""
  if killall --signal SIGINT wf-recorder &> /dev/null; then
    info "Screen record saved: $recordFile"
  else
    error "No screen record running."
  fi
}
record() {
  local command="yes | wf-recorder -f $recordFile"
  if $selection; then
    selectArea
    command+=" -g \"$area\""
  fi
  if $audio; then command+=" --audio"; fi
  command+=" &>/dev/null & disown"
  eval $command

  trap stopRecording EXIT
  
  local seconds=0
  while $recording; do
    printf "\r${red}Recording screen %02d:%02d$reset" $((seconds/60)) $((seconds%60))
    sleep 1
    ((seconds++))
  done
}

screenshot() {
  local file=/tmp/screenshot.png

  if $selection; then
    selectArea
    grim -g "$area" $file
  else
    grim $file
  fi
  wl-copy < $file
  notify-send "Screenshot" "Copied to clipboard." --hint string:image-path:file://$file
}

if $video
then record
else screenshot
fi
