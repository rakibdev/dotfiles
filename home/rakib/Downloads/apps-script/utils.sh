# Use absolute path when sourcing e.g. "source ~/path/to/utils.sh".
# Because these scripts executed in "foot -e" and "hyprland exec" with different working directory.

blue="\033[1;34m"
red="\033[1;31m"
grey="\033[1;90m"
reset="\033[0m"
info() {
  echo -e "${blue}$1${reset}";
}
error() {
  echo -e "${red}$1${reset}";
}