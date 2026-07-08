[ $# -eq 0 ] && exit 1

devices=$(adb devices | grep -c "device$")
[ "$devices" -eq 0 ] && ./adb.sh connect

for file in "$@"; do
  [ ! -f "$file" ] && echo "Not found: $file" >&2 && continue
  adb push "$file" /sdcard/Download/
done
