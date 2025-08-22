stow --restow Downloads --target="$HOME/Downloads"
stow --restow home --target="$HOME"
stow --restow etc --target=/etc


ln -sf "$(pwd)/material-gtk" "$HOME/.local/share/themes/material-gtk"