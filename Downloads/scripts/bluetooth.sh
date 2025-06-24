bluetoothctl connect $(bluetoothctl devices | awk 'NR==1{print $2}')
