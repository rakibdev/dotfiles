dir=~/Downloads/apps-script
source $dir/utils.sh

usage() {
  echo -e "$blue{type}"
  echo -e " screenshot $grey(default)$blue"
  echo " video"
  echo ""
  echo -e "$pink--selection"
  echo "--audio"
  echo -e "--help$colorOff"
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
  local command="slurp -w 0"

  local systemTheme=$(cat ~/.config/system-ui/app-data.json 2> /dev/null | tr '\n' ' ')
  if [ -n "$systemTheme" ]; then
    local color=$(bun -e "console.log(JSON.parse('$systemTheme').theme.primary_40)")
    command+=" -b \"${color}40\""
  fi

  area=$(eval $command)
  if [ $? -ne 0 ]; then exit 1; fi # Selection cancelled.
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
  if $audio; then
    source=$(pactl get-default-source)
    command+=" --audio=\"$source.monitor\""
  fi
  echo $command
  command+=" &>/dev/null & disown"
  eval $command

  trap stopRecording EXIT
  
  local seconds=0
  while $recording; do
    printf "\r${red}Recording screen %02d:%02d$colorOff" $((seconds/60)) $((seconds%60))
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
  # notify-send "Screenshot" "Copied to clipboard." --hint string:image-path:file://$file
}

if $video
then record
else screenshot
fi
