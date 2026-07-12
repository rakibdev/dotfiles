stow --restow home --target="$HOME"
stow --restow etc --target=/etc

mkdir -p "$HOME/.local/share/themes"
ln -sf "$(pwd)/material-gtk" "$HOME/.local/share/themes/material-gtk"
ln -sf "$(pwd)/material-gtk/gtk-4.0" "$HOME/.config/gtk-4.0"
ln -sf "$HOME/.config/ai/skills" "$HOME/.gemini/skills"
ln -sf "$HOME/.config/ai/skills" "$HOME/.claude/skills"
