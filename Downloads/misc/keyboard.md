1. Download software zip (contains JSON) https://rkgamingstore.com/pages/software
2. Load JSON in `Design` tab https://www.usevia.app

If you see `Received invalid protocol version from device`:

1. Open chrome://device-log/
2. Look for errors such as `Failed to open '/dev/hidraw2': FILE_ERROR_ACCESS_DENIED`
3. Give permission `sudo chmod a+rw /dev/hidraw2`
4. Once keyboard configured, download layout, revert permission `sudo chmod 600 /dev/hidraw2`

# Keyboard Remapping (rk_r65.layout.json)

- Esc → tilde/grave
- Page_Down → Esc
- Caps Lock → Super key
