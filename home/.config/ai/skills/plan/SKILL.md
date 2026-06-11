---
name: plan
description:
---
Draft implementation plan.

<rules>
- Read provided URLs if any. Don't assume links content
- Deep-dive files for full picture before plan
- Plan incrementally. If user requests adjustments, output only plan changes
- Include file paths, symbols, pseudo-code(for complex logic) in plan
- Just dicusss. Don't code unless user explicitly says `do`
- Challenge approach if more efficient or cleaner solution exists

<output-example>
**Theming system**
- Create `utils/theme.ts`. Move `getSystemTheme`, `toggleTheme` there from `hooks/useTheme.ts` and delete `hooks/useTheme.ts`
- Add `savePreference(theme)` in `utils/storage.ts`
- Edit `loadTheme` in `utils/storage.ts`
    - Fallback dark mode if `localStorage.getValue(...)` is null

**Generate material colors**
- Add `utils/material.ts`
    - Use `generateColors` to create 8 variants from `primary` color

Questions:
1. Should `generateColors` return HEX or HSL?
2. Should generation happen dynamically on client-side, or at build time?
</output-example>

</rules>
