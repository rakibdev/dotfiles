#!/bin/bash

appImagePath="$1"

generate_mac_machine_id() {
    uuid=$(uuidgen | tr '[:upper:]' '[:lower:]')
    uuid=$(echo $uuid | sed 's/.\{12\}\(.\)/4/')
    random_hex=$(echo $RANDOM | md5sum | cut -c1)
    random_num=$((16#$random_hex))
    new_char=$(printf '%x' $(( ($random_num & 0x3) | 0x8 )))
    uuid=$(echo $uuid | sed "s/.\{16\}\(.\)/$new_char/")
    echo $uuid
}

NEW_MACHINE_ID=$(uuidgen | tr -d '-')
NEW_MAC_MACHINE_ID=$(generate_mac_machine_id)
NEW_DEV_DEVICE_ID=$(uuidgen)
NEW_SQM_ID="{$(uuidgen | tr '[:lower:]' '[:upper:]')}"

echo "Generated IDs:"
echo "telemetry.machineId: $NEW_MACHINE_ID"
echo "telemetry.macMachineId: $NEW_MAC_MACHINE_ID"
echo "telemetry.devDeviceId: $NEW_DEV_DEVICE_ID"
echo "telemetry.sqmId: $NEW_SQM_ID"

STORAGE_JSON="$HOME/.config/Cursor/User/globalStorage/storage.json"
jq --arg mid "$NEW_MACHINE_ID" \
   --arg mmid "$NEW_MAC_MACHINE_ID" \
   --arg did "$NEW_DEV_DEVICE_ID" \
   --arg sid "$NEW_SQM_ID" \
   '.["telemetry.machineId"]=$mid | .["telemetry.macMachineId"]=$mmid | .["telemetry.devDeviceId"]=$did | .["telemetry.sqmId"]=$sid' \
   "$STORAGE_JSON" > "${STORAGE_JSON}.tmp"
mv "${STORAGE_JSON}.tmp" "$STORAGE_JSON"

if [ ! -d "./squashfs-root" ]; then
    chmod +x "$appImagePath" || {
        echo "Error: Unable to set execute permissions for $appImagePath"
        exit 1
    }
    "$appImagePath" --appimage-extract >/dev/null || {
        echo "Error: Failed to extract $appImagePath"
        exit 1
    }
fi

appDir="./squashfs-root/usr/share/cursor/resources/app/out"
files=(
    "$appDir/main.js"
    "$appDir/vs/code/node/cliProcessMain.js"
)
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        sed -i 's/"[^"]*\/etc\/machine-id[^"]*"/"uuidgen"/g' "$file"
        echo "Modified $file"
    fi
done

# https://github.com/rinadelph/CursorPlus
workbench="$appDir/vs/workbench/workbench.desktop.main.js"
if [ -f "$workbench" ]; then
    sed -i 's/async getEffectiveTokenLimit(e){const n=e.modelName;if(!n)return 2e5;/async getEffectiveTokenLimit(e){return 9000000;const n=e.modelName;if(!n)return 9e5;/g' "$workbench"
    sed -i 's/getModeThinkingLevel(e){[^}]*}/getModeThinkingLevel(e){return "high";}/g' "$workbench"
    echo "Modified $workbench"
fi

echo "Reset complete!"