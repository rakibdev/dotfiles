source utils.sh

usage() {
  echo -e "$pink--clean"
  echo "--update-mirrors"
  echo "--merge-pacnew"
  echo "--manual-packages"
  echo -e "--help$colorOff"
}
[ "$1" == "--help" ] && { usage; exit 0; }

updateMirrors() {
  dir=/etc/pacman.d
  temp=/tmp/mirrorlist

  info "Updating mirrors."
  rate-mirrors --save=$temp arch
  sudo mv $temp $dir/mirrorlist

  info "Updating cachyos mirrors."
  rate-mirrors --save=$temp cachyos
  sudo mv $temp $dir/cachyos-mirrorlist

  sudo cp $dir/cachyos-mirrorlist $dir/cachyos-v3-mirrorlist
  sudo sed -i 's|/$arch/|/$arch_v3/|g' $dir/cachyos-v3-mirrorlist
}
[ "$1" == "--update-mirrors" ] && { updateMirrors; exit 0; }

clean() {
  info "Cleaning..."

  if [ -d ~/.cache ]; then
    info "$(du -sh ~/.cache)"
    sudo rm -r ~/.cache
  fi

  info "Orphan packages."
  unusedPackages=$(pacman -Qtdq)
  if [ -n "$unusedPackages" ]; then
    sudo pacman -Rns --noconfirm $unusedPackages
  fi

  info "Pacman cache."
  yes | sudo pacman -Scc
}
[ "$1" == "--clean" ] && { clean; exit 0; }

mergePacnew() {
  info "Merge .pacnew files..."
  info "Press \"v\" to view diff."
  export DIFFPROG="${DIFFPROG:-code-insiders}"
  sudo DIFFPROG=$DIFFPROG pacdiff 
}
[ "$1" == "--merge-pacnew" ] && { mergePacnew; exit 0; }

if [ "$1" == "--manual-packages" ]; then
  pacman -Qti | grep -E 'Name|Installed Size|Required By'
  exit 0
fi