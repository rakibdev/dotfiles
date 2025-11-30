#include <fcntl.h>
#include <linux/input.h>
#include <linux/uinput.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define THRESHOLD_MS 100
#define KEY_C 46

static long last_up_us = 0;
static int pressed = 0;

static long event_time_us(struct input_event *e) {
    return e->time.tv_sec * 1000000L + e->time.tv_usec;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s /dev/input/eventX\n", argv[0]);
        return 1;
    }

    int fd = open(argv[1], O_RDONLY);
    if (fd < 0) { perror("open input"); return 1; }

    if (ioctl(fd, EVIOCGRAB, 1) < 0) { perror("grab"); return 1; }

    int ui = open("/dev/uinput", O_WRONLY | O_NONBLOCK);
    if (ui < 0) { perror("open uinput"); return 1; }

    ioctl(ui, UI_SET_EVBIT, EV_KEY);
    ioctl(ui, UI_SET_EVBIT, EV_SYN);
    for (int i = 0; i < KEY_MAX; i++) ioctl(ui, UI_SET_KEYBIT, i);

    struct uinput_setup setup = {0};
    strcpy(setup.name, "double-click-fix");
    setup.id.bustype = BUS_USB;
    ioctl(ui, UI_DEV_SETUP, &setup);
    ioctl(ui, UI_DEV_CREATE);

    struct input_event e;
    while (read(fd, &e, sizeof(e)) == sizeof(e)) {
        int forward = 1;

        if (e.type == EV_KEY && e.code == KEY_C) {
            long now = event_time_us(&e);

            if (e.value == 0) {
                if (pressed) {
                    last_up_us = now;
                    pressed = 0;
                } else {
                    forward = 0;
                }
            } else if (e.value == 1) {
                if (last_up_us && (now - last_up_us) < THRESHOLD_MS * 1000) {
                    forward = 0;
                } else {
                    pressed = 1;
                }
            }
        }

        if (forward) write(ui, &e, sizeof(e));
    }

    ioctl(ui, UI_DEV_DESTROY);
    close(ui);
    close(fd);
    return 0;
}
