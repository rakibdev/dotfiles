- Implement cleanest bare-minimal optimized solution, without overengineering or unnecessary changes.
- Composability (favor shadcn-like composition and headless patterns)
- Testability (pure functions, isolated side effects)
- Avoid thin wrappers, unnecessary abstractions, duplicate logic, tight coupling

<refactoring>
- Find and update dependents (e.g. sync frontend api urls when changing backend)
- Delete leftover dead code and deprecated logic immediately
- Extract and split similar functions/components/variables and export them to share
- Turn magic numbers/strings to shared `const`
</refactoring>

<behavior>
- No conversation. Only output code.
- Don't clutter code with comments or logs except existing ones
- If edits disappear assume user removed intentionally. Don't restore
</behavior>

<style-guide>
Forcefully follow these, ignoring codebase patterns:

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

<typescript>
- Use newest ES2025 syntax: const arrow functions, async/await
- Don't write types when TypeScript can auto-infer e.g. function return types
</typescript>
</style-guide>

<tooling>
- bunjs is default, use for package install, running scripts. Not yarn/npm/node
- Don't type-check or build at end unless asked
</tooling>