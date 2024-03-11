switch_window() {
    local workspace=$(hyprctl activeworkspace)
    local windowsCount=$(echo "$workspace" | pcregrep -o1 "windows: (\d+)")
    local fullscreen=$(echo "$workspace" | pcregrep -o1 "hasfullscreen: (\d+)")
    if [ $windowsCount -gt 2 ] || [ $fullscreen -eq 0 ]; then
        hyprctl dispatch fullscreen 1
    else
        hyprctl dispatch focusurgentorlast ""
        if [ $fullscreen == 0 ]; then hyprctl dispatch fullscreen 1; fi
    fi
}

close_tab_or_window() {
    local window=$(hyprctl activewindow | pcregrep -o1 "class: (\w+)")
    if [[ $window == "foot" || $window == "thunar" ]]; then
        hyprctl dispatch killactive
    else
        wtype -M ctrl w -m ctrl
    fi
}

if [ "$1" == "switch-window" ]; then switch_window; fi
if [ "$1" == "close-tab-or-window" ]; then close_tab_or_window; fi
