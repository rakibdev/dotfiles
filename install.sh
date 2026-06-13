stow --restow home --target="$HOME"
stow --restow etc --target=/etc
ln -sf "$(pwd)/material-gtk" "$HOME/.local/share/themes/material-gtk"
ln -sf "$HOME/.config/ai/skills" "$HOME/.gemini/skills"
ln -sf "$HOME/.config/ai/skills" "$HOME/.claude/skills"
