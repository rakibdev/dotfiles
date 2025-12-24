#include <fcntl.h>
#include <linux/input.h>
#include <linux/uinput.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

#define THRESHOLD_US 70000

static char is_problem_key[KEY_MAX] = {0};
static const int PROBLEM_KEYS[] = {KEY_BACKSPACE, KEY_R, KEY_N, KEY_C, KEY_SPACE, KEY_W};

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

    static long last_up[KEY_MAX];
    static char pressed[KEY_MAX];
    struct input_event e;

    for (int i = 0; i < (int)(sizeof(PROBLEM_KEYS) / sizeof(PROBLEM_KEYS[0])); i++)
        is_problem_key[PROBLEM_KEYS[i]] = 1;

    while (read(fd, &e, sizeof(e)) == sizeof(e)) {
        if (e.type == EV_KEY && is_problem_key[e.code]) {
            long now = e.time.tv_sec * 1000000L + e.time.tv_usec;
            if (e.value == 0) {
                if (!pressed[e.code]) continue;
                last_up[e.code] = now;
                pressed[e.code] = 0;
            } else if (e.value == 1) {
                if (last_up[e.code] && now - last_up[e.code] < THRESHOLD_US) continue;
                pressed[e.code] = 1;
            } else if (e.value == 2) {
                if (!pressed[e.code]) continue;
            }
        }
        write(ui, &e, sizeof(e));
    }

    ioctl(ui, UI_DEV_DESTROY);
    close(ui);
    close(fd);
    return 0;
}
