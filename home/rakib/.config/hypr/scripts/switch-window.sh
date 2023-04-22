window_count=$(hyprctl workspaces | pcregrep -o1 "windows: (\d+)")
fullscreen=$(hyprctl workspaces | pcregrep -o1 "hasfullscreen: (\d+)")
if [ $window_count -gt 2 ]; then
  hyprctl dispatch fullscreen 1
else
  hyprctl dispatch focusurgentorlast ""
  if [ $fullscreen == 0 ]; then hyprctl dispatch fullscreen 1; fi
fi