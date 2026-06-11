---
name: code
description: Coding rules
---
- Reuse code. Split identical functions, turn magic number/string to named `const`
- Clean redundant or fallback code
- Update references e.g. sync frontend fetch urls after editing backend
- Preserve existing code comments, don't clutter by adding more

<syntax-rules>
- Use modern syntax e.g. C++26, ES2026 (const, arrow functions, async/await)
- Concise is more readable. So omit explicit type-safety, nulls, validation if language can auto-infer.
Example:
 * Do: `return;`, `if (variable)`
 * Don't: `return null`, `if (variable != null)`, `if (variable > 0)`
- Omit `|| fallback text` in console.log(error.message)
- Use double equal, shorter than triple

Variable & function naming:
- Generic 1-2 words. Example:
 * Do: onSubmit, listVideos // `on` prefix is shorter
 * Don't: handleSubmitButton, listVideosWithTitle
- Short but don't abbreviate terms: Use `event` not `e`
</syntax-rules>
