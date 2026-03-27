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
  wl-clipboard
)

missing=()
for p in "${pkgs[@]}"; do
  pacman -Qi "$p" &>/dev/null || missing+=("$p")
done

[ ${#missing[@]} -gt 0 ] && sudo pacman -S "${missing[@]}"
