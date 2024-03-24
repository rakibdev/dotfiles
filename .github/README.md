> [More notes in .github folder.](/.github)

## Apps Script

Scripts for repetitive tasks.<br>
[/home/rakib/Downloads/apps-script](home/rakib/Downloads/apps-script)

Use absolute path in scripts because these excuted with different working directory in:

- .desktop exec
- foot -e
- hyprland.conf exec

❌ source ./utils.sh<br>
✔️ source ~/Downloads/apps-script/utils.sh

## Boot With UEFI Directly

Modern way. I don't use GRUB.

- Install [efibootmgr](https://github.com/rhboot/efibootmgr).
- Install [Booster](https://github.com/anatol/booster). A boot image generator. Faster, lighter than dracut.
- When updating Linux kernel pacman triggers [/etc/pacman.d/hooks/on-kernel-install.hook](/etc/pacman.d/hooks/on-kernel-install.hook) and [/etc/pacman.d/hooks/on-kernel-install](/etc/pacman.d/hooks/on-kernel-install). What it does:
  - Moves Booster image and copy [microcode](https://wiki.archlinux.org/title/microcode) to EFI partition.
  - Uses efibootmgr to sync UEFI boot entries and link these files.

## Automatic Login On Boot

Lazy to type password everytime.<br>
[/etc/systemd/system/getty@tty1.service.d/autologin.conf](/etc/systemd/system/getty@tty1.service.d/autologin.conf)

## Zram

It's a part of ram. Compresses ram to have more ram. Faster than SSD swap file.

- Install [zram-generator](https://github.com/systemd/zram-generator)
- [/etc/systemd/zram-generator.conf](/etc/systemd/zram-generator.conf)
- Disable zswap by adding `zswap.enabled=0` kernel parameter. As I manage the kernel using script [/etc/pacman.d/hooks/on-kernel-install](/etc/pacman.d/hooks/on-kernel-install#L42) so added flag there.

## Systemd Logs In Ram

Reduces unnecessary SSD write.

- [/etc/systemd/journald.conf.d/journald.conf](/etc/systemd/journald.conf.d/journald.conf)

- Delete existing logs:

```
sudo rm -r /var/log/journal/*
```

## Blacklisting Unused Kernel Modules

[/etc/modprobe.d/blacklists.conf](/etc/modprobe.d/blacklists.conf)

## PipeWire

### Virtual Surround Sound

[/home/rakib/.config/pipewire/pipewire.conf.d/virtual-surround-sound.conf](/home/rakib/.config/pipewire/pipewire.conf.d/virtual-surround-sound.conf) from [PipeWire GitLab.](https://gitlab.freedesktop.org/pipewire/pipewire/-/blob/master/src/daemon/filter-chain/sink-virtual-surround-7.1-hesuvi.conf)
[/home/rakib/.config/pipewire/pipewire.conf.d/atmos.wav](/home/rakib/.config/pipewire/pipewire.conf.d/atmos.wav) extracted from [HeSuVi_2.0.0.1.exe.](https://sourceforge.net/projects/hesuvi/files)

### Mic Noise Cancelation

[/home/rakib/.config/pipewire/pipewire.conf.d/mic-noise-cancelation.conf](/home/rakib/.config/pipewire/pipewire.conf.d/mic-noise-cancelation.conf) from [PipeWire GitLab.](https://gitlab.freedesktop.org/pipewire/pipewire/-/blob/master/src/daemon/filter-chain/source-rnnoise.conf)

- Install [noise-suppression-for-voice.](https://github.com/werman/noise-suppression-for-voice)

Don't forget to activate sinks/sources using **wpctl**. The \* indicates currently active.

```
~ wpctl status
Audio
 ├─ Devices:
 │      48. Family 17h/19h HD Audio Controller  [alsa]
 │
 ├─ Sinks:
 │  *   37. Virtual Surround Sound              [vol: 1.00]
 │      68. Family 17h/19h HD Audio Controller Digital Stereo (IEC958) [vol: 1.00]
 │
 ├─ Sources:
 │  *   36. Mic Noise Cancelation               [vol: 1.00]
 │      69. Family 17h/19h HD Audio Controller Analog Stereo [vol: 0.60]

~ wpctl set-default 37
~ wpctl set-default 36
```

## BlueZ Battery Missing

Add `--experimental` flag [/etc/systemd/system/bluetooth.service.d/bluetooth.conf](/etc/systemd/system/bluetooth.service.d/bluetooth.conf)

## Remove Pacman Multilib

During Wine installation I added "multilib” in [/etc/pacman.conf](etc/pacman.conf) which resulted in duplicate 32-bit version of each package. I don't use Wine now.

## Cleanup Unused Packages

List packages installed someway by you.

```
pacman -Qqi | grep -E "Name|Description|Required By"
```

Identify what you don't need reading package details.

todo: Link "pacman -Rns $(pacman -Qdtq)" apps script.
