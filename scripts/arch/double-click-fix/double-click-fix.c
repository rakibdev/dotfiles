#include <fcntl.h>
#include <linux/input.h>
#include <linux/uinput.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

#define THRESHOLD_US 100000
#define KEY_C 46

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s /dev/input/eventX\n", argv[0]);
        return 1;
    }

    int fd = open(argv[1], O_RDONLY);
    if (fd < 0) return 1;
    if (ioctl(fd, EVIOCGRAB, 1) < 0) return 1;

    int ui = open("/dev/uinput", O_WRONLY | O_NONBLOCK);
    if (ui < 0) return 1;

    ioctl(ui, UI_SET_EVBIT, EV_KEY);
    ioctl(ui, UI_SET_EVBIT, EV_SYN);
    for (int i = 0; i < KEY_MAX; i++) ioctl(ui, UI_SET_KEYBIT, i);

    struct uinput_setup setup = {.id.bustype = BUS_USB};
    strcpy(setup.name, "double-click-fix");
    ioctl(ui, UI_DEV_SETUP, &setup);
    ioctl(ui, UI_DEV_CREATE);

    long last_up = 0;
    int pressed = 0;
    struct input_event e;

    while (read(fd, &e, sizeof(e)) == sizeof(e)) {
        if (e.type == EV_KEY && e.code == KEY_C) {
            long now = e.time.tv_sec * 1000000L + e.time.tv_usec;
            if (e.value == 0) {
                if (!pressed) continue;
                last_up = now;
                pressed = 0;
            } else if (e.value == 1) {
                if (last_up && now - last_up < THRESHOLD_US) continue;
                pressed = 1;
            }
        }
        write(ui, &e, sizeof(e));
    }

    ioctl(ui, UI_DEV_DESTROY);
    close(ui);
    close(fd);
    return 0;
}
