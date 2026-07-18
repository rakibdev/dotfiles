pkgs=(
  noto-fonts-emoji
  nano
  git
  aria2
  ripgrep
  bottom
  foot
  grim
  slurp
  unzip
  wf-recorder
  wl-clipboard
  ddcutil
  tumbler
  ffmpegthumbnailer

  # -wlr is must for chromium screen share to work
  xdg-desktop-portal
  xdg-desktop-portal-gtk
  xdg-desktop-portal-wlr
)

missing=()
for p in "${pkgs[@]}"; do
  pacman -Qi "$p" &>/dev/null || missing+=("$p")
done

[ ${#missing[@]} -gt 0 ] && sudo pacman -S "${missing[@]}"
