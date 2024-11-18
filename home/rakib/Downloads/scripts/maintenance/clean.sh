filesize() {
  du -sh "$1" | awk '{print $1}'
}

cache=~/.cache
if [ -d $cache ]; then
  echo "Cleaning $cache ($(filesize $cache))..."
  sudo rm -r $cache
fi

echo "Cleaning pacman cache..."
yes | sudo pacman -Scc

orphanPackages=$(pacman -Qtdq)
if [ -n "$orphanPackages" ]; then
  echo "Cleaning orphan packages..."
  echo "$orphanPackages"
  sudo pacman -Rns --noconfirm $orphanPackages
fi

echo "Cleaning journal logs..."
sudo rm -r /var/log/journal/*
