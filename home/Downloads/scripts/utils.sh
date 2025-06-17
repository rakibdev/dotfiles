blue="\033[1;34m"
pink="\033[0;35m"
red="\033[1;31m"
grey="\033[0;90m"
colorOff="\033[0m"
info() {
  echo -e "${blue}info:${colorOff} $1";
}
error() {
  echo -e "${red}error:${colorOff} $1";
}