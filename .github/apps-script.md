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
> Enable wireless debugging quick settings shortcut. Developer options > Quick settings developer tiles.

### Dependencies

- android-tools (adb)

<br>

## Android as PC Webcam

Not wasting money when I can use my phone with higher quality camera. And I didn't use [IP Webcam](https://play.google.com/store/apps/details?id=com.pas.webcam) because phone was overheating.

- [Connect ADB using wireless debugging.](#connect-adb-using-wireless-debugging)
- Run `android-webcam.sh`

### Dependencies

- scrcpy (Stream camera)
- v4l2loopback-dkms (Virtual webcam device)

### Resources

- Scrcpy [GitHub](https://github.com/Genymobile/scrcpy), [camera.md](https://github.com/Genymobile/scrcpy/blob/master/doc/camera.md) and [v4l2.md](https://github.com/Genymobile/scrcpy/blob/master/doc/v4l2.md).
- ArchWiki [v4l2loopback](https://wiki.archlinux.org/title/V4l2loopback).

### Troubleshooting

```
[server] ERROR: Encoding error: java.lang.IllegalStateException: Pending dequeue output buffer request cancelled
```

In my case phone couldn't encode 4K resolution. Had to set lower resolution e.g. **-m640** in **android-webcam.sh**.

<br>

## YouTube Playlist Backup

### What it does

- Creates backup.json.
- Recovers unavailable video details from the file when running next time.
- Cleanup playlist so I don't have to manually find and remove unavailable videos.

### 1. Getting authorization & x-goog-authuser headers

This allows account sign-in to cleanup playlist on behalf of user.

1. Open DevTools network tab.
2. Reload YouTube.
3. Filter "Fetch/XHR" and look for "/account_menu" URL.
4. Values are under "Request Headers".

### 2. Add config.toml

```
countryCode="BD" // To identify blocked.
authorization="SAPISIDHASH ..."
x-goog-authuser=0

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

<br>

todo: "pacman -Rns $(pacman -Qdtq)" apps script.

<br>

## Style Guide

Use absolute path if someway executed in other places:

- .desktop entry exec
- foot -e
- hyprland.conf exec

Because they have different working directory.<br>
❌ `source ./utils.sh`<br>
✔️ `source ~/Downloads/apps-script/utils.sh`
