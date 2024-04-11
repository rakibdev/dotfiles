# Automating repetitive things<br>

[/home/rakib/Downloads/apps-script](/home/rakib/Downloads/apps-script)<br>
Here's a walkthrough:

<br>

## Capture screenshot or video/audio

Crop supported. Run `capture.sh --help` for usage.

### Dependencies

- slurp (Crop)
- grim (Screenshot)
- wf-recorder (Video and audio record)

<br>

## Connect ADB using wireless debugging

No inconvenient USB!

- Turn on wireless debugging in developer options.
- Pair if needed using `adb-wifi.sh pair`
- Connect `adb-wifi.sh connect`

<!-- prettier-ignore -->
> [!TIP]
> Enable wireless debugging quick settings shortcut: Developer options > Quick settings developer tiles.

### Dependencies

- android-tools (adb)

<br>

## Android as PC Webcam

Not wasting money when I can use my phone with higher quality camera. And I didn't use [IP Webcam](https://play.google.com/store/apps/details?id=com.pas.webcam) because phone was overheating.

- [Connect ADB using wireless debugging.](#connect-adb-using-wireless-debugging)
- Run `android-webcam.sh`

### Dependencies

- scrcpy (Stream camera)
- v4l2loopback (Virtual webcam device)

### Build v4l2loopback from source

I didn't use **v4l2loopback-dkms** because it depends on Clang, LLVM. I have GCC installed, so building from source.

- Run `v4l2loopback.sh install`. Then `modinfo v4l2loopback` to verify and reboot.

> [!IMPORTANT]
> Rebuild when updating kernel.

- To uninstall, search and delete **v4l2loopback.ko.zst** in **/lib/modules** or **/usr/lib/modules**.

### Resources

- Scrcpy GitHub [camera.md](https://github.com/Genymobile/scrcpy/blob/master/doc/camera.md) and [v4l2.md](https://github.com/Genymobile/scrcpy/blob/master/doc/v4l2.md).

### Troubleshooting

```
[server] ERROR: Encoding error: java.lang.IllegalStateException: Pending dequeue output buffer request cancelled
```

In my case phone couldn't encode 4K resolution. Had to set lower resolution e.g. **-m640** in **android-webcam.sh**.

<br>

## YouTube Playlist Backup

### What it does

- Creates backup.json containing playlist videos.
- Recovers details from the file when running next time.
- Auto cleanup unavailable videos from playlist.

### 1. Getting authorization, x-goog-authuser, cookie (not document.cookie)

Allows sign-in and perform cleanup on behalf of user.

1. Open DevTools network tab.
2. Reload YouTube.
3. Filter "Fetch/XHR" and "/youtubei/v1" URL.
4. Values are under "Request Headers".

### 2. Create config.toml

```
countryCode="US" # To identify region blocked.
authorization="SAPISIDHASH ..."
x-goog-authuser=0
cookie=""

[[playlists]]
name="music"
id="..."

[[playlists]]
name="later"
id="..."
```

### 3. Run

```
bun app.js
```

Make sure playlists are set either public or unlisted and whenever you encounter error try updating config specially cookie.

<br>

## Style Guide

Use absolute path if someway executed in other places:

- .desktop entry exec
- foot -e
- hyprland.conf exec

Because they have different working directory.<br>
❌ `source ./utils.sh`<br>
✔️ `source ~/Downloads/apps-script/utils.sh`
