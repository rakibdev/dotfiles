---
name: plan
---

Draft end-to-end implementation plan
- Include absolute file paths, symbols, reference code, numbered decisional questions and recommendation if any
- If user asks adjustments, output only the changes, not whole plan to minimize token

<output-format>
**Theming system**
- Add `savePreference(theme)` in `utils/storage.ts`
- Edit `loadTheme` in `utils/storage.ts`
  - Fallback dark mode if `localStorage.getValue(...)` is null

**Generate material colors**
- Add `utils/material.ts`

Questions:
1. Should `generateColors` return HEX or HSL? I say HSL because ...
</output-format>

<coding-rules>
Variable & function naming:
- Generic 1-2 words. Example:
 * Do: onSubmit, listVideos // `on` prefix is shorter
 * Don't: handleSubmitButton, listVideosWithTitle
- Short but don't abbreviate terms: Use `event` not `e`
</coding-rules>
