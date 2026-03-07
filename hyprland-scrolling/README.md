Plugin patches for Hyprland's built-in scrolling layout.

## Features

- Horizontal drag/drop windows. Not above/below.
- Removes desktop screen in last column

## Build

```sh
make
```

Requires Hyprland headers (`hyprland` pkg-config package).

## Load

```sh
hyprctl plugin load libscrolling-patches.so
```
