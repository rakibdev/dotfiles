PLUGIN_DIR="/home/rakib/Downloads/hyprland-plugins/hyprscrolling"
SO_PATH="$PLUGIN_DIR/hyprscrolling.so"

echo "Rebuilding hyprscrolling..."
cd "$PLUGIN_DIR" || exit 1

hyprctl plugin unload "$SO_PATH" 2>/dev/null

make clean && make

hyprctl plugin load "$SO_PATH"
