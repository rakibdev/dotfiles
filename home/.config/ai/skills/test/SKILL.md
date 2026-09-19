---
name: test
description: Test writing rules
---

- Write minimal concise test. 1-2 assertion per test
- Only add exactly what user asked, no extra tests
- Instead of writing 3 similar tests, write one advanced that covers two
- Must import functions from codebase. Avoid duplicating code
- No incidental data, no unused context, no decorative fixtures. If the bug repros with one line alone, use just that line
  - Bad:  `applyEdits('const x = 1\nconst y = 2', [{ old: 'const y = 2', new: '...' }])`
  - Good: `applyEdits('const y = 2', [{ old: 'const y = 2', new: '...' }])`
