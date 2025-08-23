save() {
    echo "state: $CLIPBOARD_STATE"
    IFS= read -rd '' content
    # echo "$content" > "/tmp/copy"
    cat > /tmp/copy
}

watch() {
    currentScript=$0
    wl-paste --type image/png --watch "$currentScript" save
}

case $1 in
    watch) watch ;;
    save) save ;;
    *)
    echo "Unknown argument \"$1\"";
    exit 1 ;;
esac