source ~/Downloads/dotfiles/scripts/utils.sh

selectArea() {
  local cmd="slurp -w 0"
  local theme=$(cat ~/.config/system-ui/app-data.json 2>/dev/null)
  if [ -n "$theme" ]; then
    local color=$(echo "$theme" | jq -r '.theme.primary_40')
    cmd+=" -b \"${color}40\""
  fi
  area=$(eval $cmd)
  [ $? -ne 0 ] && exit 1
}
