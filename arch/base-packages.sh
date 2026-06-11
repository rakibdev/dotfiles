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
)

missing=()
for p in "${pkgs[@]}"; do
  pacman -Qi "$p" &>/dev/null || missing+=("$p")
done

[ ${#missing[@]} -gt 0 ] && sudo pacman -S "${missing[@]}"
