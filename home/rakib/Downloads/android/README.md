### Using Android GSI

- [Download TrebleDroid GSI.](https://github.com/TrebleDroid/treble_experimentations/releases)
- `xz -d system-td-arm32_binder64-ab-vanilla.img.xz`
- Remove "phh-su" (Otherwise Magisk shows error "Unsupported Magisk Version")
  ```
  git clone --depth 1 https://github.com/AndyCGYan/sas-creator.git
  cd sas-creator
  sudo bash securize.sh ../system-td-arm32_binder64-ab-vanilla.img (sudo required)
  mv s-secure.img ../system.img
  ```
- Flashing
  - [Requirements.](https://source.android.com/docs/core/tests/vts/gsi#flashing-gsis)
  - [Download SDK Platform Tools zip (adb, fastboot).](https://developer.android.com/tools/releases/platform-tools)
  - Enable USB debugging and connect PC.
    ```
    ./adb reboot fastboot
    sudo -s
    ./fastboot erase system (optional. deletes user data)
    ./fastboot flash system system.img
    ./fastboot reboot
    ```
  - Wait for device to turn on.
  - `./adb kill-server` and disconnect PC.

### Apps

- [Aurora Store Nightly](https://auroraoss.com/AuroraStore/Nightly)
- Via Browser
- [MiXplorer](https://mixplorer.com/beta) and "MixTheme Creator".
- [Dantotsu](https://github.com/rebelonion/Dantotsu/releases)
- [YouTube and Music from "RVX Lite" Telegram](https://t.me/rvx_lite) and [MicroG by WSTxda.](https://github.com/WSTxda/MicroG-RE/releases)
- [Mauth](https://github.com/X1nto/Mauth/releases)
- [librecamera](https://github.com/iakmds/librecamera/releases)
- Filmora Video Editor Mod
- Picsart Mod
- YMusic Mod
- Gboard
- Google Clock
- Magisk and modules:
  - [custom-system](https://github.com/rakibdev/dotfiles/tree/main/home/rakib/Downloads/android/custom-system)
  - [HideNavBar](https://github.com/Magisk-Modules-Alt-Repo/HideNavBar)
  - [GoogleProductSansFont](https://github.com/D4rK7355608/GoogleProductSansFont)
  - [systemui-bootloop](https://github.com/Magisk-Modules-Alt-Repo/systemui-bootloop)

### Walton bootloader keys

When screen turning off immediately hold "Power + Volume Down".

### Enable System UI Tuner

`pm enable com.android.systemui/.tuner.TunerActivity` (with su)

Available in Settings > System > System UI Tuner

### Headphone jack detection on GSI

`setprop persist.sys.overlay.devinputjack true`

### Bluetooth not turning on Android 14 GSI

`setprop persist.sys.bt.unsupported.commands 182` (with su)

### Material You vibrant colors

`settings put secure theme_customization_overlay_packages '{"android.theme.customization.theme_style":"VIBRANT"}'`
