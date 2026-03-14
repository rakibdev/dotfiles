source ~/Downloads/dotfiles/scripts/capture/utils.sh

usage() {
  echo "Usage: screenshot [--selection] [--google-lens] [--help]"
}

if [[ "$1" == "--help" ]]; then usage; exit 0; fi

selection=false
google_lens=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --selection) selection=true; shift ;;
    --google-lens) google_lens=true; shift ;;
    *) error "Unknown argument: $1"; exit 1 ;;
  esac
done

if $selection; then selectArea; fi

if $google_lens; then
  b64=$(if $selection; then grim -g "$area" -; else grim -; fi | base64 -w 0)
  cat > /tmp/lens-upload.html <<EOF
<!DOCTYPE html><html><body><script>
const b64='${b64}';
const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
const file=new File([bytes],'image.png',{type:'image/png'});
const form=document.createElement('form');
form.method='POST';form.action='https://lens.google.com/v3/upload';form.enctype='multipart/form-data';form.style.display='none';
const input=document.createElement('input');input.type='file';input.name='encoded_image';
const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;
form.appendChild(input);document.body.appendChild(form);form.submit();
</script></body></html>
EOF
  xdg-open /tmp/lens-upload.html
  exit 0
fi

file="$(xdg-user-dir DOWNLOAD)/screenshot.png"
if $selection; then grim -g "$area" $file; else grim $file; fi
wl-copy < $file
notify-send "Screenshot" "Saved & copied to clipboard." --hint string:image-path:file://$file
