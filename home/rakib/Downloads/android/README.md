## Using Android GSI

- [Download TrebleDroid GSI](https://github.com/TrebleDroid/treble_experimentations/releases)
- `xz -d system-td-arm32_binder64-ab-vanilla.img.xz`
- Rename output file to "system.img".
- Remove phh-su (Magisk doesn't work otherwise. "Unsupported Magisk Version")
  ```
  git clone --depth 1 https://github.com/AndyCGYan/sas-creator.git
  cd sas-creator
  sudo bash securize.sh ../system.img` (sudo required)
  mv s-secure.img ../
  ```
- Flashing
  - [Requirements.](https://source.android.com/docs/core/tests/vts/gsi#flashing-gsis)
  - [Download SDK Platform Tools zip (adb, fastboot).](https://developer.android.com/tools/releases/platform-tools)
  - Enable USB debugging & connect PC.
    ```
    ./adb reboot fastboot
    sudo -s
    ./fastboot erase system (optional. deletes user data)
    ./fastboot flash system system.img
    ./fastboot reboot
    ```
  - Wait for device to turn on.
  - `./adb kill-server` and disconnect PC.
