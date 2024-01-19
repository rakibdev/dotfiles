## Run Windows in Arch Linux using QEMU

### Step 1: Run

- Download Windows 11 ISO. I'm using "tiny11.iso" because it's lightweight (10GB after installed, actual Windows 20GB) & already has TPM, Secure Boot requirements bypassed in regedit.
- `sudo pacman -S qemu-base`
- `qemu-img create -f qcow2 windows-11.qcow2 20G` creates a 20GB diskfile. Initially should be about 180KB, because qcow2 format allocates space when needed.
- Run QEMU for first time
  - **-enable-kvm**: For performance. Make sure to enable virtualization (also known as SVM for AMD) in BIOS.
  - **-m**: RAM.
  - **-usb -device usb-tablet**: Fixes guest cursor pointer misaligned with host cursor.

```
qemu-system-x86_64 \
  -enable-kvm \
  -m 3G \
  -cpu host \
  -smp cpus=2,cores=2,threads=1 \
  -cdrom 'tiny11.iso' \
  -hda 'windows-11.qcow2' \
  -usb -device usb-tablet
```

Output:
`VNC server running on ::1:5900`

### Step 2: View

- `sudo pacman -S gtk-vnc`
- `gvncviewer ::1:5900`

Now install Windows normally.

### Step 3: Reuse

To launch already installed diskfile just remove "-cdrom" argument.

### File sharing

[Mount qcow2 diskfile using qemu-nbd.](https://wiki.archlinux.org/title/QEMU#Mounting_a_partition_from_a_qcow2_image)

## Troubleshooting

### "This pc can't run win 11" during setup

```
cd %WINDIR%/panther
type setupact.log
```

Read "setupact.log" and search for "Error". In my case I already have TPM, Secure Boot bypassed, but still complained.
Because Windows requires 2 core, and I didn't add "-smp cpus=2".
