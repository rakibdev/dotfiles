# double-click-fix stops working
Kernel 7.0.3 update progressively expose more keyboard interfaces for keyboard. Service uses glob `usb-Hangsheng_RK-R65-*event*` for future-proof.
- `event-kbd` → event2 (main keyboard)
- `event-if02` → event4 (Consumer Control)
- `if02-event-joystick` → event3 (System Control)
- `if02-event-kbd` → event5 (secondary keyboard)

- 100ms catches all observed bounces (max observed: ~69ms under fast typing). Re-tune threshold using `wev`

- Has hold-to-repeat