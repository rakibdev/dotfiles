source utils.sh

hasError() {
  local code=$?
  [ $code -ne 0 ]
}

color=$1
if [ -z "$color" ]; then
  error "No color provided."
  info "Usage: $0 #000000"
  exit 1;
fi

output=$(system-ui theme build $color)
if hasError; then
  if [ -n "$output" ]
    then error "System UI: $output"
    else error "System UI: Failed."
  fi
  exit 1
fi

output=$(hyprctl reload)
if [ "$output" == "ok" ]
  then info "Hyprland reloaded."
  else error "Hyprland reload failed: $output";
fi

./reload-gtk.sh
if hasError
  then info "GTK reloaded."
  else error "GTK reload failed."
fi

info "Finished. Some apps may require restart."
