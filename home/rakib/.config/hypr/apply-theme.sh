# force reload
gsettings set "$gnome_schema" gtk-theme ""
gsettings set "$gnome_schema" icon-theme ""
gsettings set "$gnome_schema" cursor-theme ""
sleep 1

gnome_schema="org.gnome.desktop.interface"
gtk_theme="MonoThemeDark"
icon_theme="Adwaita"
cursor_theme="Bibata-Modern-Classic"
font_name="Google Sans"
gsettings set "$gnome_schema" gtk-theme "$gtk_theme"
gsettings set "$gnome_schema" icon-theme "$icon_theme"
gsettings set "$gnome_schema" cursor-theme "$cursor_theme"
gsettings set "$gnome_schema" cursor-size 18
gsettings set "$gnome_schema" font-name "$font_name"