declare -A flags=(
    [thunar]="~/Downloads"
    [/opt/visual-studio-code-insiders/code-insiders]="--ozone-platform=wayland --no-sandbox"
    
    # Enable Settings > "Use system title bar and borders" when using Wayland
    # Ungoogled Chromium flags
    [/usr/bin/chromium]="--ozone-platform-hint=wayland --custom-ntp=chrome://new-tab-page --bookmark-bar-ntp=never --show-avatar-button=never --remove-tabsearch-button --remove-grab-handle --hide-tab-close-buttons --disable-sharing-hub"
)

declare -A icons=(
    [foot]="./icons/terminal.png"
    [org.xfce.thunar]="./icons/files.png"
    [visual-studio-code-insiders]="./icons/visual-studio-code.png"
    [chromium]="./icons/chromium.png"
)

validate_icon() {
    test -f "$1" && icon_path="$1" && return 0
    icon_path=$(find $2 -name $1.png | sort -r | head -n 1)
    test -f "$icon_path" && return 0
}

load_icon() {
    icon_dir=/usr/share/icons
    icon_dir2=/usr/share/icons/hicolor
    icon_dir3=/usr/share/pixmaps
    test "$icon_name" || return
    validate_icon $icon_name $icon_dir && return
    validate_icon $icon_name $icon_dir2 && return
    validate_icon $icon_name $icon_dir3 && return
}

load_apps() {
    apps=""
    files=$(find /usr/share/applications -type f -name \*.desktop | fzy --show-matches="$1")
    
    for file in $files; do
        exec=$(pcregrep -o1 "Exec=(\S+)" $file | head -1)
        if echo $apps | grep -q "$exec"; then continue; fi
        
        flag=${flags[$exec]}
        if [ -n "$flag" ]; then exec+=" $flag"; fi
        
        name=$(pcregrep -o1 "Name=(.*)" $file | head -1)
        icon_name=$(pcregrep -o1 "Icon=(\S+)" $file | head -1)
        load_icon
        icon=${icons[$icon_name]:-$icon_path}
        icon=${icon:-"./icons/arch.png"}
        
        apps+='{"label":"'$name'", "icon":"'$icon'", "exec":"'$exec'"}'
    done
    
    apps=$(echo $apps | sed -e 's/}{/},{/g')
    eww update apps="[$apps]"
}

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


# todo: display custom scripts like youtube-backup.js
