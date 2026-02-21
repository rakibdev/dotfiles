---
name: browser
description: Control browser tabs via raw CDP. Code runs as browser JS in the page.
---

Daemon auto-starts on first use, auto-kills after **3 minutes** of inactivity.

## Usage

```bash
bun {dir}/scripts/play.ts tabs                         # list open tabs
bun {dir}/scripts/play.ts [tab] "code"                 # run browser JS on tab (default: first)
bun {dir}/scripts/play.ts [tab] https://...            # navigate tab
bun {dir}/scripts/play.ts [tab] Domain.method [json]   # send raw CDP command
bun {dir}/scripts/play.ts close [tab]                  # close tab
bun {dir}/scripts/play.ts new [url|code|cdp]           # open new tab, optionally run/navigate
```

`[tab]` = 1-based index or partial URL string to match.

**Examples**

```bash
# List tabs
bun {dir}/scripts/play.ts tabs

# Run browser JS (first tab)
bun {dir}/scripts/play.ts "return document.title"

# Run on tab 2
bun {dir}/scripts/play.ts 2 "return document.title"

# Navigate by partial URL match
bun {dir}/scripts/play.ts github.com https://github.com/trending

# Close tab 3
bun {dir}/scripts/play.ts close 3

# Open new tab and navigate
bun {dir}/scripts/play.ts new https://example.com

# Scrape data
bun {dir}/scripts/play.ts "return [...document.querySelectorAll('h2')].map(el => el.textContent.trim())"
```

## Context

Code runs as **browser JavaScript** in the page. All browser globals available: `document`, `window`, `location`, `fetch`, etc. Use `return` to output a value. Objects are JSON-formatted.

## Raw CDP Commands

Auto-detected when payload matches `Domain.method` pattern. Optionally pass params as JSON after a space.

```bash
# Enable debugger
bun {dir}/scripts/play.ts "Debugger.enable"

# Set breakpoint
bun {dir}/scripts/play.ts 'Debugger.setBreakpointByUrl {"lineNumber":42,"urlRegex":".*app\\.js$"}'

# Pause on exceptions
bun {dir}/scripts/play.ts 'Debugger.setPauseOnExceptions {"state":"uncaught"}'

# Emulate device metrics
bun {dir}/scripts/play.ts 'Emulation.setDeviceMetricsOverride {"width":390,"height":844,"deviceScaleFactor":3,"mobile":true}'

# Get cookies
bun {dir}/scripts/play.ts "Network.getCookies"
```

## Network

```bash
# Monitor via JS (intercept fetch in page)
bun {dir}/scripts/play.ts "
const orig = fetch
window.fetch = async (...a) => { console.log('REQ:', a[0]); return orig(...a) }
"

# Enable network events via CDP, then get cookies
bun {dir}/scripts/play.ts "Network.enable"
bun {dir}/scripts/play.ts "Network.getCookies"
```
