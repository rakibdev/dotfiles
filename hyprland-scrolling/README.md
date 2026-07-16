Plugin patches for Hyprland's built-in scrolling layout.

## Features

- Horizontal drag/drop windows. Not above/below.

## Build

```sh
make
```

Requires Hyprland headers (`hyprland` pkg-config package).

## Load

```sh
hyprctl plugin load libscrolling-patches.so
```
