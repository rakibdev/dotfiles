---
name: code
description: Contains critical coding rules
lazy: false
---

<rules>
- Implement cleanest solution; minimal, readable code
- Refactor dependents too (e.g. sync frontend endpoint when changing backend) and cleanup leftover orphan code after migration
- Never duplicate code. Whenever you notice identical, export them for reuse. Move magic numbers in const

- Don't add new comments in code except originals
- If your edits somehow missing, assume user intentionally did it so don't re-apply
- Use bunjs, not yarn/npm/node
- Don't type-check or build unless asked
  </rules>

<style>
Forcefully follow these:

# Clean syntax. No unnecessary verbosity
- Avoid `null` e.g. simply `return;` not `return null`
- Use double equal, not triple
- Don't need `> 0` in `if (array.length)`
- Prefer single-line ifs, early returns
- Use if-else over switch-case

## Naming
Use generic, 1-2 concise words for variables/functions:
✘ listVideosWithTitle ✔ listVideos // Use generic, not too specific
✘ handleClick ✔ onClick // Avoid `handle` word. Use `on` because concise
✘ e ✔ event // I said concise, not abbreviated

## toast/log format
Do: `Photo saved`
Don't: `Photo saved sucessfully` // Useless prefix/suffix

Do: console.log(error.message) // Direct without extra texts
Don't: console.log(`Error: {error.message || "placeholder"}`)
</style>

<typescript>
- Use newest ES2025 syntax: const arrow functions, async/await
- Don't write types when TypeScript can auto-infer e.g. function return types
</typescript>
