dir=~/Downloads/apps-script
source $dir/utils.sh

usage() {
	echo -e "${blue}connect"
	echo -e "pair$colorOff"
}
if [ $# -eq 0 ] || [ "$1" == "--help" ]; then
  usage
  exit 0
fi

getUri() {
	local type=$1
	for line in $(avahi-browse --terminate --resolve --parsable $type); do
		if [[ $line != =* ]]; then continue; fi
		ip=$(echo "$line" | cut -d ';' -f 8)
		port=$(echo "$line" | cut -d ';' -f 9)
		uri="${ip}:${port}"
	done
}

connect() {
	getUri "_adb-tls-connect._tcp"

	if [ -z "$uri" ]; then
		error "Couldn't find any device."
		exit 1
	fi
	
	info "Connecting $uri..."
	adb connect $uri
}

waitPairingUri() {
	sleep 2
	getUri "_adb-tls-pairing._tcp"
	if [ -z "$uri" ]; then waitPairingUri; fi
}


pair() {
	info "Opening QR code in browser..."

	# random
	name="debug"
	password="1234"
	data="WIFI:T:ADB;S:$name;P:$password;;"
	xdg-open https://api.qrserver.com/v1/create-qr-code/?data=$data &> /dev/null

	info "Waiting for scanning to complete..."
	waitPairingUri

	info "Pairing $uri..."
	adb pair $uri $password
}


if [ "$1" == "connect" ]; then connect
elif [ "$1" == "pair" ]; then pair
fi