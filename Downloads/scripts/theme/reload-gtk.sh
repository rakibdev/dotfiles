config=~/.config/gtk-3.0/settings.ini
schema="org.gnome.desktop.interface"

while IFS='=' read -r key value
do
  if [ $key == "gtk-theme-name" ]; then
    gtkTheme=$value
  elif [ $key == "gtk-icon-theme-name" ]; then
    iconTheme=$value
  elif [ $key == "gtk-cursor-theme-name" ]; then
    cursorTheme=$value
  elif [ $key == "gtk-cursor-theme-size" ]; then
    cursorSize=$value
  elif [ $key == "gtk-font-name" ]; then
    fontName=$value
  fi
done < "$config"


# force reload
gsettings set "$schema" gtk-theme ""
gsettings set "$schema" icon-theme ""
gsettings set "$schema" cursor-theme ""
gsettings set "$schema" font-name ""

gsettings set "$schema" gtk-theme "$gtkTheme"
gsettings set "$schema" icon-theme "$iconTheme"
gsettings set "$schema" cursor-theme "$cursorTheme"
gsettings set "$schema" cursor-size "$cursorSize"
gsettings set "$schema" font-name "$fontName"