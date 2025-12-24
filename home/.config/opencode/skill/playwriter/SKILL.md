---
name: playwriter
description: Tool for controlling browser via Playwriter extension.
---

## Setup

1. Install [Playwriter extension](https://chromewebstore.google.com/detail/playwriter-mcp/jfeammnjpkecdekppnclgkkffahnhfhe)
2. Click extension icon on target tab (icon turns green)

## Usage

```bash
bun {base dir}/scripts/cmd.ts "<code>"
```

**Examples**

```bash
# Get page URL
bun {base dir}/scripts/cmd.ts "console.log(page.url())"

# Click button
bun {base dir}/scripts/cmd.ts "await page.getByRole('button', { name: 'Submit' }).click()"

# Get page title
bun {base dir}/scripts/cmd.ts "const t = await page.evaluate(() => document.title); console.log(t)"

# Fill form
bun {base dir}/scripts/cmd.ts "await page.getByLabel('Email').fill('test@example.com')"
```

## Context

Variables available in code:

- `page` - Current Playwright page
- `context` - Browser context
- `state` - Persistent object across calls

## Debugging

```js
// Enable debugger
const cdp = await page.context().newCDPSession(page);
await cdp.send('Debugger.enable');
await cdp.send('Debugger.setPauseOnExceptions', { state: 'uncaught' });

// Set breakpoint
await cdp.send('Debugger.setBreakpointByUrl', { lineNumber: 42, urlRegex: '.*app\\.js$' });
```

## Network

```js
// Wait for API response
const res = await page.waitForResponse(r => r.url().includes('/api/data'));
console.log(await res.json());

// Monitor requests
page.on('request', r => console.log('REQ:', r.url()));
await page.reload();
page.removeAllListeners('request');
```
