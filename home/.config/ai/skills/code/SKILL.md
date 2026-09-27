---
name: code
trigger: do$
---
Code end-to-end. Don't leave unfinished
- No over-defensive:
 * Try-catches
 * Redundant checks `!= null`, `> 0` in if
 * Strict equality
 * `error.message || 'useless text'`
- Omit return/declaration types where language auto-infer
- Omit `null` if optional: `return null`
- No fragile: `if (error == 'Error 404')`
- No new comments but leave existing untouched
- Don't run typecheck/test
