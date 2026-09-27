scriptDir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
templatesDir="$scriptDir/templates"
themeCli=~/Downloads/system-ui/build/theme

darkMode="true"
for arg in "$@"; do
  if [ "$arg" = "--light" ]; then
    darkMode="false"
  fi
done

$themeCli "$@" --template "$templatesDir/foot.ini" > ~/.config/foot/colors.ini
$themeCli "$@" --template "$templatesDir/hyprland.conf" > ~/.config/hypr/colors.conf

colorsOutput=$($themeCli "$@" --template "$templatesDir/gtk.css")

echo "$colorsOutput" > ~/.local/share/themes/material-gtk/shared/colors.css

mkdir -p ~/.config/system-ui
$themeCli "$@" --template "$templatesDir/gtk.css" --glass > ~/.config/system-ui/colors.css
$themeCli "$@" --template "$templatesDir/nvim.lua" --glass > ~/.config/nvim/lua/colors.lua

$themeCli "$@" | \
  jq --argjson darkMode $darkMode '. + {darkMode: $darkMode}' \
  > ~/.config/system-ui/theme.json

# bun vscode.ts

output=$(hyprctl reload)
if [ "$output" != "ok" ]; then
  echo "Hyprland reload error: $output" >&2
fi

"$scriptDir/reload-gtk.sh"
if [ $? -ne 0 ]; then
  echo "GTK reload error." >&2
fi

"$scriptDir/reload-foot.sh"
if [ $? -ne 0 ]; then
  echo "Foot reload error." >&2
fi
