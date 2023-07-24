declare -A custom_flags=(
    [thunar]="~/Downloads"
    [/opt/visual-studio-code-insiders/code-insiders]="--ozone-platform=wayland"
    # Enable Settings > "Use system title bar and borders" when using Wayland
    # Ungoogled Chromium flags
    [/usr/bin/chromium]="--ozone-platform-hint=wayland --custom-ntp=chrome://new-tab-page --bookmark-bar-ntp=never --show-avatar-button=never --remove-tabsearch-button --remove-grab-handle --hide-tab-close-buttons --disable-sharing-hub"
)

declare -A custom_icons=(
    [foot]="./icons/terminal.png"
    [org.xfce.thunar]="./icons/files.png"
    [visual-studio-code-insiders]="./icons/visual-studio-code.png"
    [chromium]="./icons/chromium.png"
)

load_icon() {
    if [ -n "${custom_icons[$icon_name]}" ]; then icon_path=${custom_icons[$icon_name]}; return; fi
    icon_path=$(find ~/.local/share/icons /usr/share/icons \( -type f -o -type l \) \( -name "$icon_name.svg" -o -name "$icon_name.png" \) -print -quit)
    [ -n "$icon_path" ] && return
    icon_path="./icons/arch.png"
}

load_apps() {
    apps=""
    files=$(find /usr/share/applications -type f -name *.desktop | fzy --show-matches="$1")
    
    for file in $files; do
        exec=$(pcregrep -o1 "Exec=(\S+)" $file | head -1)
        if echo $apps | grep -q "$exec"; then continue; fi
        
        flag=${custom_flags[$exec]}
        if [ -n "$flag" ]; then exec+=" $flag"; fi
        
        # grep -oP 'Icon=\K.*'

        name=$(pcregrep -o1 "Name=(.*)" $file | head -1)
        icon_name=$(pcregrep -o1 "Icon=(\S+)" $file | head -1)
        load_icon
        
        apps+='{"label":"'$name'", "icon":"'$icon_path'", "exec":"'$exec'"}'
    done
    
    apps=$(echo $apps | sed -e 's/}{/},{/g')
    eww update apps="[$apps]"
}
# time load_apps "v"


if [ "$1" == "open" ]; then
    eww open apps_window
    hyprctl dispatch submap window
    load_apps
fi
if [ "$1" == "close" ]; then
    eww close apps_window
    hyprctl dispatch submap reset
fi
if [ "$1" == "query" ]; then load_apps $2; fi