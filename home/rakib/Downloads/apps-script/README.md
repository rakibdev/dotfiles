### Use absolute path in shell scripts.

`source ./utils.sh` ❌
`source ~/Downloads/apps-script/utils.sh` ✔️

If someway used in:

- .desktop exec
- foot -e utils.sh
- hyprland.conf exec

These are executed with different working directory.
