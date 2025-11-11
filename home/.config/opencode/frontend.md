- Always use `toast.error(error.message)` in catch blocks, never `console.error`
- Minimize DOM nesting by avoiding unnecessary wrappers (<div>)

# Vue

- Use modern v3.5+ syntax (e.g. defineModel, defineEmits named tuple, useTemplateRef)
- Use shorthands prop in templates (e.g. `prop` instead of `:prop={true}`)
- PascalCase for component, camelCase for prop e.g. `@update:modeValue` over `@update:model-value`
- Structure: First <template>, then <script>, then <style>
- Prefer `@update:modelValue` instead of `watch`
- Use `<template v-if>` instead of empty `<div v-if>`. Put `v-for` directly on components, not wrapper divs

# Tailwind

- Use spacing scale: 2,4,6,8 for p/m/gap
- Use `size-` if same width/height or w-/h-

# shadcn-vue

- Avoid `for=` and `id=` in <Label> or <Input> components
- No need for margins (mr-,ml-) in <Button> inner icons
