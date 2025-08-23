source ./utils.sh

cursorDir=~/Downloads/cursor-ai
cd "$cursorDir"

appImageFile=$(ls Cursor-*.AppImage 2>/dev/null | head -n 1)

if [ -z "$appImageFile" ]; then
    error "No Cursor AppImage found in $cursorDir"
    exit 1
fi

chmod +x "$appImageFile"
info "Extracting AppImage..."
./"$appImageFile" --appimage-extract

mv squashfs-root/usr/* .

info "Cleaning up..."
rm -rf squashfs-root
rm "$appImageFile"