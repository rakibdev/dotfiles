read -p "Color (Hex): " color

templatesDir="$(pwd)/templates"
themeCli=~/Downloads/system-ui/extensions/theme/build/theme
$themeCli --color "$color" --template "$templatesDir/foot.ini" > ~/.config/foot/colors.ini
$themeCli --color "$color" --template "$templatesDir/hyprland.conf" > ~/.config/hypr/colors.conf
$themeCli --color "$color" --template "$templatesDir/gtk.css" > ~/.local/share/themes/material-gtk/gtk-3.0/colors.css

# bun vscode.ts

output=$(hyprctl reload)
if [ "$output" != "ok" ]; then
  echo "Hyprland reload error: $output" >&2
fi

./reload-gtk.sh
if [ $? -ne 0 ]; then
  echo "GTK reload error." >&2
fi
