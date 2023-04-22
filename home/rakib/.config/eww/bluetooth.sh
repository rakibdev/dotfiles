mac_address=$(bluetoothctl devices | grep AirPods | cut -d ' ' -f2)
device=$(bluetoothctl info $mac_address)
if echo "$device" | grep -q "Connected: yes"; then
    connected_device=$(echo "$device" | grep "Name" | cut -d ' ' -f2-);
    battery=$(echo $device | pcregrep -o1 "Battery Percentage:.*\((\d+)\)");
fi

if [ "$1" == "toggle" ]; then
    bluetoothctl power off >> /dev/null
    if [ -z "$connected_device" ]; then
        bluetoothctl power on >> /dev/null
        sleep 1
        bluetoothctl connect $mac_address >> /dev/null
    else
        bluetoothctl disconnect $mac_address >> /dev/null
    fi
fi

echo '{ "mac_address":"'$mac_address'", "connected_device":"'$connected_device'", "battery":'${battery:=0}' }'