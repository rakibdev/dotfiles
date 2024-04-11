dir=~/Downloads/apps-script
source $dir/utils.sh

usage() {
	echo -e "${blue}install$colorOff"
}
if [ $# -eq 0 ] || [ "$1" == "--help" ]; then
  usage
  exit 0
fi

install() {
  temp=/tmp/v4l2loopback
  git clone --depth=1 https://github.com/umlaeute/v4l2loopback.git $temp
  cd $temp
  make clean
  make && sudo make install
  rm -rf $temp
}

if [ "$1" == "install" ]; then install; fi