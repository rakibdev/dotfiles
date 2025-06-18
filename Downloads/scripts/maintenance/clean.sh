filesize() {
  du -sh "$1" | awk '{print $1}'
}

clean() {
  local path="$1"
  if [ -e "$path" ]; then
    echo "Cleaning $path ($(filesize $path))..."
    sudo rm -r "$path"
  fi
}

clean ~/.cache/*
clean /tmp/*
clean /var/log/journal/*
clean /usr/share/locale
clean /usr/share/man
clean /usr/share/gtk-doc

echo "Cleaning pacman cache..."
yes | sudo pacman -Scc

orphanPackages=$(pacman -Qtdq)
if [ -n "$orphanPackages" ]; then
  echo "Cleaning orphan packages..."
  echo "$orphanPackages"
  sudo pacman -Rns --noconfirm $orphanPackages
fi