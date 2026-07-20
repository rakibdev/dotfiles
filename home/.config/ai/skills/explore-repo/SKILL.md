---
name: explore-repo
description: Explore github repo to understand feature implementation
---

1. Read file tree `bun scripts/tree.ts <github_url>`. Depth is upto 3 level; tree.ts on subdir URL to explore deeper.
2. webfetch/curl raw URLs to read individual file

Banned commands: git clone, git grep, git -C

# Output
- Reference code, symbols, file paths, end-to-end logic flow step-by-step
- Inline comments explaining inner workings of code

<output-format>
rating.ts#L22
// Bayesian avg
```typescript
const score = (avg  v + C  m) / (v + m)
```
...
</output-format>
