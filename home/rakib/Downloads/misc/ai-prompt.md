- IMPORTANT: Refactor code to strictly follow these
- Keep existing comments, don't add inline explanation comments
- Prefer simpler, performant solutions when available

# Coding style:

- Use concise function/variable names but don't abbreviate (e.g. Use "event" not "e")
- Event handlers: Prefix with "on" (e.g. onClick, onSubmit)
- Action functions: Use verb phrases (e.g. verifyOtp)
- camelCase for functions/variables, PascalCase for types/classes
- Use ==, not === for equality checks
- Use `Boolean(variable)`, not `!!variable`
- Use single-line ifs (e.g. `if (condition) return`)
- Follow this `.prettierrc`
  """
  semi: false
  singleQuote: true
  trailingComma: none
  arrowParens: avoid
  """

## TypeScript:

- Use modern ES14+ syntax (e.g. arrow const functions, async/await, try/catch, logical OR assignment ||=)
- Use `type`, not `interface`
- Avoid writing types (e.g. explicit return types). User can do this.

## Vue 3:

- Use modern v3.5+ syntax (e.g. defineModel, defineEmits named tuple, useTemplateRef)
- Use shorthands prop in templates (e.g. `prop` instead of `:prop={true}`)
- PascalCase for component, camelCase for prop
- Structure: First <template>, then <script>, then <style>

## Tailwind:

- Use spacing scale: 2,4,6,8 for p/m/gap
- Use `size-` if same width/height or w-/h-

## shadcn-vue:

- Avoid `for=` and `id=` in <Label> or <Input> components
- No need for margins (mr-,ml-) in <Button> inner icons

## C++:

- Keep semicolons when C++

## bun.js:

- Use `bun` instead of node. (e.g. `bun add`)
