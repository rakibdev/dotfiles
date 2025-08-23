local colorsFile="$HOME/.config/foot/colors.ini"

if [ ! -f "$colorsFile" ]; then
  echo "Colors file not found: $colorsFile" >&2
  exit 1
fi

local background=$(grep "^background=" "$colorsFile" | cut -d'=' -f2)
local foreground=$(grep "^foreground=" "$colorsFile" | cut -d'=' -f2)
local selectionForeground=$(grep "^selection-foreground=" "$colorsFile" | cut -d'=' -f2)
local selectionBackground=$(grep "^selection-background=" "$colorsFile" | cut -d'=' -f2)

for tty in /dev/pts/*; do
  if [ -c "$tty" ] && [ -w "$tty" ]; then
    {
      printf '\033]104\007'
      printf '\033]11;#%s\007' "$background"
      printf '\033]10;#%s\007' "$foreground"
      printf '\033]19;#%s\007' "$selectionForeground"
      printf '\033]17;#%s\007' "$selectionBackground"
    } > "$tty" 2>/dev/null
  fi
done
