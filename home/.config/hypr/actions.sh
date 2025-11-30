close_tab_or_window() {
    local window=$(hyprctl activewindow | pcregrep -o1 "class: (\w+)")
    if [[ $window == "foot" || $window == "thunar" ]]; then
        hyprctl dispatch killactive
    else
        wtype -M ctrl w -m ctrl
    fi
}

cycle_recent_windows() {
    local state_file="/tmp/toggle_window"
    
    if [[ -f $state_file ]]; then
        rm $state_file
        hyprctl dispatch layoutmsg "move -col"
    else
        touch $state_file
        hyprctl dispatch layoutmsg "move +col"
    fi
}

if [ "$1" == "close-tab-or-window" ]; then close_tab_or_window; fi
if [ "$1" == "cycle-recent-windows" ]; then cycle_recent_windows; fi