## Using Android GSI

- [Download TrebleDroid GSI.](https://github.com/TrebleDroid/treble_experimentations/releases)
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

## Enter Walton bootloader to recover soft brick

When screen turning off immediately press Power + Volume Down.

## Apps

- [Aurora Store Nightly](https://auroraoss.com/AuroraStore/Nightly)
- Via Browser (Google Play)
- [MiXplorer](https://mixplorer.com/beta). Also "MixTheme Creator" (Google Play) to use Material You.
- [Dantotsu](https://github.com/rebelonion/Dantotsu/releases)
- [YouTube & Music from "RVX Lite" Telegram](https://t.me/rvx_lite) and [MicroG by WSTxda.](https://github.com/WSTxda/MicroG-RE/releases)
- [Mauth](https://github.com/X1nto/Mauth/releases)
- [librecamera](https://github.com/iakmds/librecamera/releases)
- Filmora Video Editor Mod
- Picsart Mod
- YMusic Mod
- Gboard
- Google Clock
- Magisk & Modules
  - custom-system
  - [HideNavBar](https://github.com/Magisk-Modules-Alt-Repo/HideNavBar)
  - [GoogleProductSansFont](https://github.com/D4rK7355608/GoogleProductSansFont)
  - [systemui-bootloop](https://github.com/Magisk-Modules-Alt-Repo/systemui-bootloop)
