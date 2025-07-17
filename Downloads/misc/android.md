## Android GSI

- [Download latest TrebleDroid GSI.](https://github.com/TrebleDroid/treble_experimentations/releases)
- Extract.

```
xz -d system-td-arm32_binder64-ab-vanilla.img.xz
```

- Remove pre-installed "phh-su" app to avoid "Unsupported Magisk Version" error.

```
git clone --depth 1 https://github.com/AndyCGYan/sas-creator.git
cd sas-creator
sudo bash securize.sh ../system-td-arm32_binder64-ab-vanilla.img
mv s-secure.img ../system.img
```

### Flashing

- [Requirements.](https://source.android.com/docs/core/tests/vts/gsi#flashing-gsis)
- [Download SDK Platform Tools (adb, fastboot).](https://developer.android.com/tools/releases/platform-tools)
- Enable USB debugging and connect PC.

```
./adb reboot fastboot
sudo -s
./fastboot erase system (Optional. Resets system.)
./fastboot flash system system.img
./fastboot reboot
```

> [!NOTE]
> If you see system partition doesn't exist when flashing then make sure you're in fastboot mode, not in recovery or bootloader.

- Wait for device to turn on.

```
./adb kill-server
```

- Disconnect PC.

## FAQ

### Entering Walton bootloader

After reboot when splash is turned off immediately press and hold "Volume Up + Power".
https://www.youtube.com/watch?v=DurlIVSALdY

### Enable System UI Tuner

```
su
pm enable com.android.systemui/.tuner.TunerActivity
```

Available in Settings > System > System UI Tuner

### Headphone jack detection on GSI

```
setprop persist.sys.overlay.devinputjack true
```

### Bluetooth not turning on Android 14 GSI

```
su
setprop persist.sys.bt.unsupported.commands 182
```

### Material You vibrant color variant

```
settings put secure theme_customization_overlay_packages '{"android.theme.customization.theme_style":"VIBRANT"}'
```

### Spam in logs

If you see this:
`AidlConversion: legacy2aidl_audio_channel_mask_t_AudioChannelLayout: no AudioChannelLayout found for legacy input / voice audio_channel_mask_t`

Fix: https://github.com/DerTeufel/lineage_device_lenovo_x606fa/commit/4f81a6a4895fdc1870c1136bd715bc09b459eaa1

## Favorite apps

- [Cromite](https://github.com/uazo/cromite)
- [MiXplorer](https://mixplorer.com/beta) & MixTheme Creator.
- [Dantotsu](https://github.com/rebelonion/Dantotsu/releases)
- [YouTube Lite and Music (Telegram)](https://t.me/rvx_lite) & [MicroG by WSTxda.](https://github.com/WSTxda/MicroG-RE/releases)
- [Aurora Store Nightly](https://auroraoss.com/AuroraStore/Nightly)
- [librecamera](https://github.com/iakmds/librecamera/releases)
- [Mauth](https://github.com/X1nto/Mauth/releases)
- [Picsart Mod (Telegram)](https://t.me/PicsArtMods)
- Filmora Video Editor Mod
- YMusic Mod.
  - Not to confuse the name with YouTube Music. It's for downloading music with thumbnail. Alternatives like Seal is slow.
- Gboard
- Google Clock
- Magisk & modules:
  - [custom-system](/home/rakib/Downloads/android/custom-system)
  - [HideNavBar](https://github.com/Magisk-Modules-Alt-Repo/HideNavBar)
  - [GoogleProductSansFont](https://github.com/D4rK7355608/GoogleProductSansFont)
  - [systemui-bootloop](https://github.com/Magisk-Modules-Alt-Repo/systemui-bootloop)

## Initial Setup

- Screen lock: none
- Screen timeout: 1 minute
- Use location: false
- Touch sounds: false
- Use battery manager: false

- Notifications

  - Enhanced notifications: false
  - Wireless emergency alerts: false

- Gesture navigation

  - Increase left/right sensitivity

- Developer options

  - Window animation scale: 0.5
  - Transition animation scale: 0.5
  - Animator duration scale: 0.5
  - Disable adb authorization timeout: true
  - Quick settings developer tiles
    - Wireless debugging: true

- Quick tiles:
  ```
  Internet         | Flashlight
  Wireless Debugging | Bluetooth
  Battery Saver    | Screen Recording
  ```
