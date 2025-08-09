filesize() {
  du -sh "$1" | awk '{print $1}'
}

clean() {
  local path="$1"
  if [ -e "$path" ]; then
    echo "Cleaning $path ($(filesize $path))..."
    if [ -f "$path" ]; then
      sudo rm -f "$path"
    elif [ -d "$path" ]; then
      # Wildcard to delete content, not directory itself.
      sudo rm -rf "$path"/*
    fi
  fi
}

clean ~/.cache
clean /tmp
clean /var/tmp
clean /var/log/journal
clean /var/cache

clean /usr/share/locale
clean /usr/share/man
clean /usr/share/gtk-doc
clean /usr/share/doc

# System coredumps (can be very large)
clean /var/lib/systemd/coredump

clean ~/.local/share/Trash

clean ~/.local/share/recently-used.xbel

yes | sudo pacman -Scc

orphanPackages=$(pacman -Qtdq)
if [ -n "$orphanPackages" ]; then
  echo "Cleaning orphan packages..."
  echo "$orphanPackages"
  sudo pacman -Rns --noconfirm $orphanPackages
fi