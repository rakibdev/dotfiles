PLUGIN_DIR="$HOME/Downloads/dotfiles/hyprland-scrolling"

echo "Rebuilding hyprland-scrolling..."
cd "$PLUGIN_DIR" || exit 1

hyprctl plugin unload "$PLUGIN_DIR/libscrolling-patches.so" 2>/dev/null

make clean && make

hyprctl plugin load "$PLUGIN_DIR/libscrolling-patches.so"
