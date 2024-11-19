<!-- prettier-ignore -->
> [!IMPORTANT]
> Notes in [.github](/.github) directory.

## Boot with UEFI directly

Modern method. I don't use GRUB.<br>
When updating Linux kernel pacman hook runs [/etc/pacman.d/hooks/on-kernel-install](/etc/pacman.d/hooks/on-kernel-install). What it does:

- Moves Booster image and [microcode](https://wiki.archlinux.org/title/microcode) to EFI partition.
- Updates UEFI boot entries linking these files using efibootmgr.

### Dependencies

- [efibootmgr](https://github.com/rhboot/efibootmgr)
- [Booster](https://github.com/anatol/booster) (Boot image generator. Faster, lighter than dracut.)

<br>

## Automatic login on boot

Lazy to type password everytime.<br>
[/etc/systemd/system/getty@tty1.service.d/autologin.conf](/etc/systemd/system/getty@tty1.service.d/autologin.conf)

<br>

## Zram

It's a part of ram. Compresses ram to have more ram. Faster than SSD swap file.

- Install [zram-generator](https://github.com/systemd/zram-generator)
- [/etc/systemd/zram-generator.conf](/etc/systemd/zram-generator.conf)
- Disable zswap by adding `zswap.enabled=0` kernel parameter. As I manage the kernel using script [/etc/pacman.d/hooks/on-kernel-install](/etc/pacman.d/hooks/on-kernel-install#L42) so added flag there.

<br>

## Systemd logs in ram

Reduces unnecessary SSD write.

- [/etc/systemd/journald.conf.d/journald.conf](/etc/systemd/journald.conf.d/journald.conf)

- Delete existing logs:

```
sudo rm -r /var/log/journal/*
```

<br>

## Blacklisting unused kernel modules

[/etc/modprobe.d/blacklists.conf](/etc/modprobe.d/blacklists.conf)

<br>

## PipeWire

[/home/rakib/.config/pipewire/pipewire.conf.d](/home/rakib/.config/pipewire/pipewire.conf.d)

### Virtual Surround Sound

**virtual-surround-sound.conf** from [PipeWire GitLab](https://gitlab.freedesktop.org/pipewire/pipewire/-/blob/master/src/daemon/filter-chain/sink-virtual-surround-7.1-hesuvi.conf).<br>
**atmos.wav** extracted from [HeSuVi_2.0.0.1.exe](https://sourceforge.net/projects/hesuvi/files).

### Mic Noise Cancelation

**mic-noise-cancelation.conf** from [PipeWire GitLab](https://gitlab.freedesktop.org/pipewire/pipewire/-/blob/master/src/daemon/filter-chain/source-rnnoise.conf).<br>
Dependencies: [noise-suppression-for-voice](https://github.com/werman/noise-suppression-for-voice).

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

<br>

## BlueZ battery missing

Add `--experimental` flag [/etc/systemd/system/bluetooth.service.d/bluetooth.conf](/etc/systemd/system/bluetooth.service.d/bluetooth.conf)

<br>

## Remove pacman multilib

During Wine installation I added "multilib” in [/etc/pacman.conf](/etc/pacman.conf) which resulted in duplicate 32-bit version of each package. I don't use Wine now.

<br>

## Cleanup unused packages

List packages installed someway by you.

```
pacman -Qqi | grep -E "Name|Description|Required By"
```

Identify what you don't need reading package details.

## aria2 Download Manager

Use aria2 as download manager instead of default Google Chrome download manager.<br>
Useful for downloading files faster e.g. GitHub releases from browser.

## Shell Packages

- [zoxide](https://github.com/ajeetdsouza/zoxide)
- [zsh-autosuggestions](https://github.com/zsh-users/zsh-autosuggestions)
- [zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting)
