1. Download software zip (contains JSON) https://rkgamingstore.com/pages/software
2. Load JSON in `Design` tab https://www.usevia.app

If you see `Received invalid protocol version from device`:

1. Open chrome://device-log/
2. Find access denied errors with text like `hidraw/hidraw3`
3. Give permission `sudo chmod a+rw /dev/hidraw3`
4. Once keyboard configured, download layout, revert permission `sudo chmod 600 /dev/hidraw3`

# Keyboard Remapping (rk_r65.layout.json)

- Esc → tilde/grave
- Page_Down → Esc
- Caps Lock → Super key
