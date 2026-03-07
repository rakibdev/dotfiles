---
name: code
description: Contains critical coding rules
lazy: false
---

<rules>
- Implement best cleanest solution
- Refactor dependents too (e.g. sync frontend endpoint when changing backend) and cleanup leftover dead code after migration
- Never duplicate code. Whenever you notice identical, forcefully split/export to reuse, move magic numbers in const

- Don't add new comments in code except originals
- If your edits somehow gone, assume user did it intentionally so don't add back
- Don't type-check or build unless asked
- bunjs is default, not yarn/npm/node
  </rules>

<code-format>
Forcefully follow these (ignoring codebase patterns):

# No unnecessary verbosity

- Simply `return;` not `return null`. Avoid null everywhere
- Use double equal, not triple
- Don't need `> 0` in `if (array.length)`
- Use Single-line ifs, early returns
- Use if-else over switch-case

## Naming

Use generic, 1-2 concise words for variables/functions:
✘ listVideosWithTitle ✔ listVideos // Use generic, not too specific
✘ handleClick ✔ onClick // Avoid `handle` word. Use `on` because concise
✘ e ✔ event // I said concise, not abbreviated

## toast/logging

Do: `Photo saved`
Don't: `Photo saved sucessfully` // Useless prefix/suffix

Do: console.log(error.message) // Direct without extra texts
Don't: console.log(`Error: {error.message || "placeholder"}`)
</code-format>

<typescript>
- Use newest ES2025 syntax: const arrow functions, async/await
- Don't write types when TypeScript can auto-infer e.g. function return types
</typescript>
