---
name: code
---
Implement end-to-end.
Rules:
- Cut defensive code:
 * No try-catches, paranoid checks `!= null`, `> 0`
 * Use loose equality
- Drop null/`return null`; prefer undefined/implicit void
- Drop return/declaration types where auto-infer
- No new comments but leave existing untouched
