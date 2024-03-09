# Linux Guide

### Boot with UEFI directly

Modern method. I don't use GRUB.

- Install [efibootmgr](https://github.com/rhboot/efibootmgr)
- This script generates boot entry using efibootmgr [/etc/pacman.d/hooks/on-kernel-install](/etc/pacman.d/hooks/on-kernel-install) whenever pacman updates Linux [/etc/pacman.d/hooks/on-kernel-install.hook](/etc/pacman.d/hooks/on-kernel-install.hook)

### Automatic login

Entering password everytime I boot personal computer is troublesome.<br>
[/etc/systemd/system/getty@tty1.service.d/autologin.conf](/etc/systemd/system/getty@tty1.service.d/autologin.conf)

### zram

It's a part of ram. Faster than SSD swap file.

- Install [zram-generator](https://github.com/systemd/zram-generator)
- [/etc/systemd/zram-generator.conf](/etc/systemd/zram-generator.conf)
- Disable zswap adding `zswap.enabled=0` kernel parameter. As I boot with UEFI directly, so added here [/etc/pacman.d/hooks/on-kernel-install](/etc/pacman.d/hooks/on-kernel-install#L42)

### Systemd logs in ram

Reduces unnecessary SSD write.

- [/etc/systemd/journald.conf.d/journald.conf](/etc/systemd/journald.conf.d/journald.conf)

- Clear existing logs:

  ```
  sudo rm -r /var/log/journal/*
  ```

### Blacklisting unused kernel modules

[/etc/modprobe.d/blacklists.conf](/etc/modprobe.d/blacklists.conf)

### PipeWire surround sound

[/home/rakib/.config/pipewire](/home/rakib/.config/pipewire)

### Apps Script

[/home/rakib/Downloads/apps-script](home/rakib/Downloads/apps-script)

#### Use absolute path in shell scripts.

❌ `source ./utils.sh`<br>
✔️ `source ~/Downloads/apps-script/utils.sh`

If someway executed using:

- .desktop exec
- foot -e
- hyprland.conf exec

Because these have different working directory.
<br>
<br>

# Android Guide

### Prepare GSI

- [Download TrebleDroid GSI.](https://github.com/TrebleDroid/treble_experimentations/releases)
- Extract ` 
xz -d system-td-arm32_binder64-ab-vanilla.img.xz`
- Remove "phh-su". Otherwise Magisk shows error "Unsupported Magisk Version".
  ```
  git clone --depth 1 https://github.com/AndyCGYan/sas-creator.git
  cd sas-creator
  sudo bash securize.sh ../system-td-arm32_binder64-ab-vanilla.img
  mv s-secure.img ../system.img
  ```

### Flashing GSI

- [Requirements.](https://source.android.com/docs/core/tests/vts/gsi#flashing-gsis)
- [Download SDK Platform Tools zip (adb, fastboot).](https://developer.android.com/tools/releases/platform-tools)
- Enable USB debugging and connect PC.
  ```
  ./adb reboot fastboot
  sudo -s
  ./fastboot erase system (Optional. Resets system.)
  ./fastboot flash system system.img
  ./fastboot reboot
  ```
- Wait for device to turn on.
- `./adb kill-server` and disconnect PC.

### Entering Walton bootloader

When screen is turning off immediately hold "Power + Volume Down".

### Enable System UI Tuner

`pm enable com.android.systemui/.tuner.TunerActivity` (With "su")

Available in Settings > System > System UI Tuner

### Headphone jack detection on GSI

`setprop persist.sys.overlay.devinputjack true`

### Bluetooth not turning on Android 14 GSI

`setprop persist.sys.bt.unsupported.commands 182` (With "su")

### Material You vibrant colors

`settings put secure theme_customization_overlay_packages '{"android.theme.customization.theme_style":"VIBRANT"}'`

### Apps

- [Aurora Store Nightly](https://auroraoss.com/AuroraStore/Nightly)
- Via Browser
- [MiXplorer](https://mixplorer.com/beta) & MixTheme Creator.
- [Dantotsu](https://github.com/rebelonion/Dantotsu/releases)
- [YouTube and Music (Telegram)](https://t.me/rvx_lite) & [MicroG by WSTxda.](https://github.com/WSTxda/MicroG-RE/releases)
- [Mauth](https://github.com/X1nto/Mauth/releases)
- [librecamera](https://github.com/iakmds/librecamera/releases)
- [Picsart Mod (Telegram)](https://t.me/PicsArtMods)
- Filmora Video Editor Mod
- YMusic Mod.
  Used for downloading music with thumbnail. Not to confuse with YouTube Music.
  Alternatives like Seal is slow.
- Gboard
- Google Clock
- Magisk & modules:
  - [custom-system](/home/rakib/Downloads/android/custom-system)
  - [HideNavBar](https://github.com/Magisk-Modules-Alt-Repo/HideNavBar)
  - [GoogleProductSansFont](https://github.com/D4rK7355608/GoogleProductSansFont)
  - [systemui-bootloop](https://github.com/Magisk-Modules-Alt-Repo/systemui-bootloop)
