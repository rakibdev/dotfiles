local home    = os.getenv("HOME")
local scripts = home .. "/Downloads/dotfiles/scripts"
local ui      = "/usr/bin/ui"
local launcher= home .. "/Downloads/system-ui/build/launcher.so"
local panel   = home .. "/Downloads/system-ui/build/panel.so"

hl.monitor({ output = "", mode = "highrr", position = "auto", scale = 1 })

hl.env("XCURSOR_THEME", "Bibata-Modern-Classic")
hl.env("XCURSOR_SIZE", "18")

hl.on("hyprland.start", function()
    hl.exec_cmd("hyprctl plugin load " .. home .. "/Downloads/dotfiles/hyprland-scrolling/libhyprland-scrolling.so")
    hl.exec_cmd("mako")
    hl.exec_cmd("wl-paste --type image/png --watch cat > /tmp/copy.png")
    hl.exec_cmd("dbus-update-activation-environment --systemd WAYLAND_DISPLAY XDG_CURRENT_DESKTOP")
    hl.exec_cmd("pactl set-card-profile alsa_card.pci-0000_07_00.6 output:analog-stereo+input:analog-stereo")
    hl.exec_cmd("amixer -c 1 sset 'Headphone' 100% unmute")
    hl.exec_cmd(ui .. " daemon")
    hl.exec_cmd(home .. "/Downloads/userscripts/material-web/serve 9999 " .. home .. "/.config/system-ui/theme.json")
end)

hl.window_rule({ match = { title = ".*is sharing.*" }, move = "100% 100%" })
hl.window_rule({ match = { title = "Open File" }, float = true })
hl.window_rule({ match = { float = false }, rounding = 0 })

-- ignore_alpha hides bleed in rounded corners
hl.layer_rule({ match = { namespace = "launcher" }, blur = true, ignore_alpha = 0.3 })
hl.layer_rule({ match = { namespace = "panel" },    blur = true, ignore_alpha = 0.3 })

hl.workspace_rule({ workspace = "f[1]", gaps_out = 0, gaps_in = 0 })

hl.config({
    general = {
        gaps_in   = 0,
        gaps_out  = 0,
        border_size = 0,
        layout    = "scrolling",
    },
    decoration = {
        rounding = 20,
        blur = {
            enabled = true,
            size = 6,
            passes = 2,
            popups = true,
        },
    },
    animations = {
        enabled = true,
    },
    misc = {
        disable_hyprland_logo         = true,
        disable_autoreload            = true,
        disable_hyprland_guiutils_check = true,
    },
    xwayland = {
        enabled = false,
    },
    scrolling = {
        column_width          = 1.0,
        explicit_column_widths = "0.5, 1.0",
        follow_focus          = false,
    },
    input = {
        repeat_delay  = 300,
        scroll_factor = 2.0,
        kb_options    = "caps:super",

	-- fixes: ctrl+c in 2nd window (vscode) closes 3rd (godot) but hyprland jumps focus to 1st (chrome)
	focus_on_close = 2
    },
})

hl.curve("bounce", { type = "bezier", points = { { 0.4, 0.8 }, { 0.4, 1.0 } } })
hl.animation({ leaf = "windows", enabled = true, speed = 2, bezier = "bounce", style = "popin" })

hl.bind("SUPER + Q", hl.dsp.window.close())
hl.bind("SUPER + T", hl.dsp.exec_cmd("foot"))

hl.bind("SUPER + S", hl.dsp.exec_cmd(ui .. " " .. launcher .. " toggle"))
hl.bind("SUPER + P", hl.dsp.exec_cmd(ui .. " " .. panel .. " toggle"))

hl.bind("SUPER + right", hl.dsp.exec_cmd("media next"))
hl.bind("SUPER + left",  hl.dsp.exec_cmd("media previous"))

hl.bind("SUPER + mouse:272", hl.dsp.window.resize(), { mouse = true })
hl.bind("SUPER + mouse:273", hl.dsp.window.drag(),   { mouse = true })

hl.bind("SUPER + mouse_down", hl.dsp.layout("move -col"))
hl.bind("SUPER + mouse_up",   hl.dsp.layout("move +col"))

hl.bind("SUPER + F", hl.dsp.layout("colresize +conf"))

hl.bind("SUPER + up",         hl.dsp.exec_cmd("wpctl set-volume @DEFAULT_AUDIO_SINK@ 15%+ --limit 0.4"))
hl.bind("SUPER + down",       hl.dsp.exec_cmd("wpctl set-volume @DEFAULT_AUDIO_SINK@ 15%-"))
hl.bind("SUPER + SHIFT + up", hl.dsp.exec_cmd("ddcutil setvcp 10 + 15"))
hl.bind("SUPER + SHIFT + down", hl.dsp.exec_cmd("ddcutil setvcp 10 - 15"))

hl.bind("XF86AudioPlay",  hl.dsp.exec_cmd("media play-pause"))
hl.bind("XF86AudioPause", hl.dsp.exec_cmd("media play-pause"))
hl.bind("XF86AudioNext",  hl.dsp.exec_cmd("media next"))
hl.bind("XF86AudioPrev",  hl.dsp.exec_cmd("media previous"))

hl.bind("Page_Up",       hl.dsp.exec_cmd(scripts .. "/capture/screenshot.sh --selection"))
hl.bind("ALT + Page_Up", hl.dsp.exec_cmd(scripts .. "/capture/screenshot.sh --selection --google-lens"))

local cycleState = false
hl.bind("mouse:276", function()
    cycleState = not cycleState
    hl.dispatch(hl.dsp.layout(cycleState and "move +col" or "move -col"))
end)

hl.bind("mouse:275", function()
    local w = hl.get_active_window()
    if w and (w.class == "foot" or w.class == "thunar") then
        hl.dispatch(hl.dsp.window.close())
    else
        -- send_shortcut spams "wwwwww" after closing tabs.
        -- send_key_state and state = "up" both needed to fix
        hl.dispatch(hl.dsp.send_key_state({ mods = "CTRL", key = "W", state = "down" }))
        hl.dispatch(hl.dsp.send_key_state({ mods = "CTRL", key = "W", state = "up" }))
    end
end)
