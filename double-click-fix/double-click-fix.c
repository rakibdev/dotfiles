#include <asm/unistd.h>
#include <linux/fcntl.h>
#include <linux/input.h>
#include <linux/uinput.h>
#include <sys/epoll.h>

#define THRESHOLD_US 50000
#define KEY_SPACE    57
#define NUM_KEYS     8

static const unsigned short PROBLEM_KEYS[NUM_KEYS] = { 14, 17, 18, 19, 31, 49, 46, 57 };
static unsigned char KEY_IDX[KEY_SPACE + 1];
static long long     last_down[NUM_KEYS];

static inline long sys1(long n, long a) {
    long r;
    __asm__ volatile ("syscall" : "=a"(r) : "0"(n), "D"(a) : "rcx", "r11", "memory");
    return r;
}
static inline long sys3(long n, long a, long b, long c) {
    long r;
    __asm__ volatile ("syscall" : "=a"(r) : "0"(n), "D"(a), "S"(b), "d"(c) : "rcx", "r11", "memory");
    return r;
}
static inline long sys4(long n, long a, long b, long c, long d) {
    long r;
    register long r10 __asm__("r10") = d;
    __asm__ volatile ("syscall" : "=a"(r) : "0"(n), "D"(a), "S"(b), "d"(c), "r"(r10) : "rcx", "r11", "memory");
    return r;
}

#define open(path, flags, mode)   sys3(__NR_open, (long)(path), flags, mode)
#define read(fd, buf, n)          sys3(__NR_read, fd, (long)(buf), n)
#define write(fd, buf, n)         sys3(__NR_write, fd, (long)(buf), n)
#define ioctl(fd, req, arg)       sys3(__NR_ioctl, fd, req, (long)(arg))
#define epoll_create1(flags)      sys1(__NR_epoll_create1, flags)
#define epoll_ctl(ep, op, fd, ev) sys4(__NR_epoll_ctl, ep, op, fd, (long)(ev))
#define epoll_wait(ep, evs, n, t) sys4(__NR_epoll_wait, ep, (long)(evs), n, t)
#define exit(code)                sys1(__NR_exit_group, code)

void run(long argc, char **argv) {
    if (argc < 2) {
        write(2, "Usage: double-click-fix /dev/input/eventX [...]\n", 48);
        exit(1);
    }

    for (int i = 0; i <= KEY_SPACE; i++) KEY_IDX[i] = 0xFF;
    for (unsigned i = 0; i < NUM_KEYS; i++) KEY_IDX[PROBLEM_KEYS[i]] = (unsigned char)i;

    int fds[8], nfds = 0;
    for (int i = 1; i < argc && nfds < 8; i++) {
        int fd = (int)open(argv[i], O_RDONLY, 0);
        if (fd < 0) exit(1);
        if (ioctl(fd, EVIOCGRAB, 1) < 0) exit(1);
        fds[nfds++] = fd;
    }

    int ui = (int)open("/dev/uinput", O_WRONLY | O_NONBLOCK, 0);
    if (ui < 0) exit(1);
    ioctl(ui, UI_SET_EVBIT, EV_KEY);
    ioctl(ui, UI_SET_EVBIT, EV_SYN);
    for (int k = 0; k < KEY_MAX; k++) ioctl(ui, UI_SET_KEYBIT, k);

    struct uinput_setup setup = {};
    setup.id.bustype = BUS_USB;
    const char *name = "double-click-fix";
    for (int i = 0; name[i]; i++) setup.name[i] = name[i];
    ioctl(ui, UI_DEV_SETUP, &setup);
    ioctl(ui, UI_DEV_CREATE, 0);

    int ep = (int)epoll_create1(0);
    for (int i = 0; i < nfds; i++) {
        struct epoll_event ev = { .events = EPOLLIN, .data.fd = fds[i] };
        epoll_ctl(ep, EPOLL_CTL_ADD, fds[i], &ev);
    }

    struct epoll_event events[8];
    while (1) {
        int n = (int)epoll_wait(ep, events, 8, -1);
        if (n <= 0) continue;
        for (int i = 0; i < n; i++) {
            struct input_event e;
            if (read(events[i].data.fd, &e, sizeof(e)) != sizeof(e)) continue;
            if (e.type == EV_KEY && e.code <= KEY_SPACE && KEY_IDX[e.code] != 0xFF) {
                unsigned idx = KEY_IDX[e.code];
                long long now = (long long)e.time.tv_sec * 1000000 + e.time.tv_usec;
                if (e.value == 1) {
                    if (last_down[idx] && now - last_down[idx] < THRESHOLD_US) continue;
                    last_down[idx] = now;
                }
            }
            write(ui, &e, sizeof(e));
        }
    }
}

__attribute__((naked)) void _start(void) {
    __asm__ volatile (
        "mov (%rsp), %rdi\n"
        "lea 8(%rsp), %rsi\n"
        "call run\n"
        "mov $231, %rax\n"
        "xor %rdi, %rdi\n"
        "syscall\n"
    );
}
