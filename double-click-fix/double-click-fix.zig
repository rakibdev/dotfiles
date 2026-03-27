const std = @import("std");
const linux = std.os.linux;
const posix = std.posix;

const THRESHOLD_US: i64 = 70000;

const EVIOCGRAB: u32 = 0x40044590;
const UI_SET_EVBIT: u32 = 0x40045564;
const UI_SET_KEYBIT: u32 = 0x40045565;
const UI_DEV_SETUP: u32 = 0x405c5503;
const UI_DEV_CREATE: u32 = 0x5501;
const UI_DEV_DESTROY: u32 = 0x5502;

const EV_SYN: u16 = 0;
const EV_KEY: u16 = 1;
const KEY_MAX: u32 = 767;

const KEY_BACKSPACE: u16 = 14;
const KEY_W: u16 = 17;
const KEY_E: u16 = 18;
const KEY_R: u16 = 19;
const KEY_S: u16 = 31;
const KEY_N: u16 = 49;
const KEY_C: u16 = 46;
const KEY_SPACE: u16 = 57;

const PROBLEM_KEYS = [_]u16{ KEY_BACKSPACE, KEY_W, KEY_E, KEY_R, KEY_S, KEY_N, KEY_C, KEY_SPACE };
const NUM_KEYS = PROBLEM_KEYS.len;

const InputEvent = extern struct {
    sec: u64,
    usec: u64,
    type: u16,
    code: u16,
    value: i32,
};

const UinputId = extern struct {
    bustype: u16,
    vendor: u16,
    product: u16,
    version: u16,
};

const UinputSetup = extern struct {
    id: UinputId,
    name: [80]u8,
    ff_effects_max: u32,
};

const BUS_USB: u16 = 0x03;

pub fn main() !void {
    var args = std.process.args();
    _ = args.next(); // skip argv[0]
    const dev_path = args.next() orelse {
        _ = linux.write(2, "Usage: double-click-fix /dev/input/eventX\n", 42);
        return error.BadArgs;
    };

    const fd = @as(i32, @intCast(linux.open(dev_path.ptr, .{ .ACCMODE = .RDONLY }, 0)));
    if (fd < 0) return error.OpenFailed;

    if (@as(isize, @bitCast(linux.ioctl(fd, EVIOCGRAB, 1))) < 0) return error.GrabFailed;

    const ui = @as(i32, @intCast(linux.open("/dev/uinput", .{ .ACCMODE = .WRONLY, .NONBLOCK = true }, 0)));
    if (ui < 0) return error.UinputFailed;

    _ = linux.ioctl(ui, UI_SET_EVBIT, EV_KEY);
    _ = linux.ioctl(ui, UI_SET_EVBIT, EV_SYN);
    var k: u32 = 0;
    while (k < KEY_MAX) : (k += 1) _ = linux.ioctl(ui, UI_SET_KEYBIT, k);

    var setup = std.mem.zeroes(UinputSetup);
    setup.id.bustype = BUS_USB;
    const dev_name = "double-click-fix";
    @memcpy(setup.name[0..dev_name.len], dev_name);
    _ = linux.ioctl(ui, UI_DEV_SETUP, @intFromPtr(&setup));
    _ = linux.ioctl(ui, UI_DEV_CREATE, 0);

    var last_up = [_]i64{0} ** NUM_KEYS;
    var pressed = [_]bool{false} ** NUM_KEYS;

    var e: InputEvent = undefined;
    while (linux.read(fd, @ptrCast(&e), @sizeOf(InputEvent)) == @sizeOf(InputEvent)) {
        if (e.type == EV_KEY) {
            var idx: isize = -1;
            for (PROBLEM_KEYS, 0..) |key, i| {
                if (e.code == key) { idx = @intCast(i); break; }
            }
            if (idx >= 0) {
                const i: usize = @intCast(idx);
                const now: i64 = @as(i64, @intCast(e.sec)) * 1_000_000 + @as(i64, @intCast(e.usec));
                if (e.value == 0) {
                    if (!pressed[i]) continue;
                    last_up[i] = now;
                    pressed[i] = false;
                } else if (e.value == 1) {
                    if (last_up[i] != 0 and now - last_up[i] < THRESHOLD_US) continue;
                    pressed[i] = true;
                } else if (e.value == 2) {
                    if (!pressed[i]) continue;
                }
            }
        }
        _ = linux.write(ui, @ptrCast(&e), @sizeOf(InputEvent));
    }

    _ = linux.ioctl(ui, UI_DEV_DESTROY, 0);
    _ = linux.close(ui);
    _ = linux.close(fd);
}
