dir=~/Downloads/apps-script
source $dir/utils.sh

read -p "Color (Hex): " color

if [ -z "$color" ]; then
  error "No color provided."
  exit 1;
fi

output=$(system-ui theme $color)
if [ $? -ne 0 ]; then
  if [ -n "$output" ]; then echo "$output"; fi
  exit 1
fi

system-ui patch $dir/theme/templates/foot.ini  ~/.config/foot/foot.ini
system-ui patch $dir/theme/templates/hyprland.conf  ~/.config/hypr/hyprland.conf
system-ui patch $dir/theme/templates/colors.css  ~/.local/share/themes/material-gtk/gtk-3.0/colors.css
bun vscode.js

output=$(hyprctl reload)
if [ "$output" == "ok" ]
then info "Hyprland reloaded."
else error "Hyprland reload failed: $output";
fi

$dir/theme/reload-gtk.sh
if [ $? -eq 0 ]
then info "GTK reloaded."
else error "GTK reload failed."
fi

info "Finished. Some apps may require restart."
