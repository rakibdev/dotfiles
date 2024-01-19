## Run Windows in Arch Linux using QEMU

### Step 1: Run

- Download Windows 11 ISO. I'm using "tiny11.iso" because it's lightweight & already has TPM, Secure Boot requirements bypassed in regedit.
- `sudo pacman -S qemu-base`
- `qemu-img create -f qcow2 windows-11.qcow2 20G` creates a 20GB diskfile. Initially should be about 180KB, because qcow2 format allocates space when needed.
- Run QEMU for first time
  - -enable-kvm: Increases performance. Make sure to enable virtualization (also known as SVM for AMD) in BIOS.
  - -m: Memory 3GB

```
qemu-system-x86_64 \
  -enable-kvm \
  -m 3G \
  -cpu host \
  -smp cpus=2,cores=2,threads=1 \
  -cdrom 'tiny11.iso' \
  -hda 'windows-11.qcow2'
```

Output:
`VNC server running on ::1:5900`

### Step 2: View

- `sudo pacman -S remmina libvncserver`
- `remmina -c vnc://:5900`

Now install Windows normally.

### Step 3: Reuse

Just remove "-cdrom" argument to launch already installed diskfile.

## Troubleshooting

### "This pc can't run win 11" during setup

```
cd %WINDIR%/panther
type setupact.log
```

Read "setupact.log" and search for "Error". In my case I already have TPM, Secure Boot bypassed, but still complained.
Because Windows requires 2 core, and I didn't add "-smp cpus=2".
