---
name: react-vue
description: React and Vue rules
pattern: \.(vue|tsx?|jsx?)(\s|$)
---

- Minimize DOM nesting (avoid useless wrappers, use Fragments / `<template v-if>`)
- Use shorthand for boolean props (e.g. `<Component prop />` or `prop` instead of `prop={true}`)
- Component names in PascalCase, props in camelCase
- Use `toast.error(error.message)` in catch blocks, never `console.error`

### React
- Modern React 19+ patterns only (e.g. `use` for promises/context, Server Actions, `useFormStatus`)
- Logic first: Define hooks/state at the top, then return JSX. Keep components lean
- Prefer `onChange` over `useEffect` for syncing state whenever possible
- Avoid `useCallback`/`useMemo` unless it's actually heavy. React is fast enough, don't be extra

### Vue
- Use modern v3.5+ syntax (e.g. defineModel, defineEmits named tuple, useTemplateRef)
- Structure: First <template>, then <script>, then <style>
- Prefer `@update:modelValue` instead of `watch`
- Put `v-for` directly on components, not wrapper divs
