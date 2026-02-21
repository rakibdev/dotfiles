---
name: browser
description: Control browser tabs via raw CDP. Code runs as browser JS in the page.
---

Daemon auto-starts on first use, auto-kills after **3 minutes** of inactivity.

## Usage

```bash
bun scripts/play.ts tabs                         # list open tabs
bun scripts/play.ts [tab] "code"                 # run browser JS on tab (default: first)
bun scripts/play.ts [tab] https://...            # navigate tab
bun scripts/play.ts [tab] Domain.method [json]   # send raw CDP command
bun scripts/play.ts close [tab]                  # close tab
bun scripts/play.ts new [url|code|cdp]           # open new tab, optionally run/navigate
```

Code runs as **browser JavaScript** in the page. All browser globals available: `document`, `window`, `location`, `fetch`, etc. Use `return` to output a value. Objects are JSON-formatted. `[tab]` = 1-based index.

**Examples**

```bash
# Scrape data on tab by index
bun scripts/play.ts 2 "return [...document.querySelectorAll('h2')].map(el => el.textContent.trim())"
```

## Raw CDP Commands

```bash
# Enable debugger
bun scripts/play.ts "Debugger.enable"

# Set breakpoint
bun scripts/play.ts 'Debugger.setBreakpointByUrl {"lineNumber":42,"urlRegex":".*app\\.js$"}'

# Pause on exceptions
bun scripts/play.ts 'Debugger.setPauseOnExceptions {"state":"uncaught"}'

# Get cookies
bun scripts/play.ts "Network.getCookies"
```

## Network

```bash
# Monitor via JS (intercept fetch in page)
bun scripts/play.ts "
const orig = fetch
window.fetch = async (...a) => { console.log('REQ:', a[0]); return orig(...a) }
"
```
