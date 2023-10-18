# Script to automatically connect, manage android device & share files.
# Turn on "Wirless Debugging" before. Using "Quick settings developer tiles".

connectDevice() {
	for line in $(avahi-browse --terminate --resolve --parsable --no-db-lookup _adb-tls-connect._tcp); do
		if [[ $line != =* ]]; then continue; fi

		ip=$(echo "$line" | cut -d ';' -f 8)
		port=$(echo "$line" | cut -d ';' -f 9)
		uri="${ip}:${port}"

		echo "info: connecting to device $uri..."
		response=$(./adb connect $uri)
		if [[ $response =~ connected ]]; then
			echo "info: device connected."
			return
		else echo "error: unable to connect."
		fi
	done

	echo "error: unable to find device."
}

connectedDevices=$(./adb devices | grep -w device)
if [[ -z "$connectedDevices" ]]; then connectDevice; fi

if [ "$1" == "push" ]; then
	./adb push $2 /sdcard/Download/
elif [ "$1" == "pull" ]; then
	./adb pull "/sdcard/$2"
else
	echo "error: unknown command."
	exit 1
fi