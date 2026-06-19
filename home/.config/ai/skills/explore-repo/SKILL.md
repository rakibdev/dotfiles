---
name: explore-repo
description: Explore github repo to understand feature implementation
pattern: github\.com/[\w-]+/[\w-]+
---

- Read directory tree once: `bun scripts/tree.ts <github_url>`
- Then webfetch/curl individual files using raw URL
- Never download files e.g. git clone or git grep

<output>
- Cite code snippets, pseudo-code for representing complex logic and execution flow across files
- Brief comments explaining inner workings before each code block
- List relevant full github paths at bottom

<example>
Entrypoint in index.ts#L5:
```typescript
export const run = () => execute()
```

Core logic in core.ts#L10:
```typescript
export const execute = () => console.log("run")
```

Files:
- github.com/user/repo/blob/main/index.ts
- github.com/user/repo/blob/main/core.ts
</example>

</output>
