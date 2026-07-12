---
name: explore-repo
description: Explore github repo to understand feature implementation
pattern: github\.com/[\w-]+/[\w-]+
---

- Read directory tree once: `bun scripts/tree.ts <github_url>`
- Then webfetch/curl individual files using raw URL
- Don't download files locally (e.g. git clone, git grep, or git -C)

<output>
- Cite code snippets, pseudo-code for representing complex logic and execution flow across files
- Brief comments explaining inner workings before each code block
- List relevant full github paths at bottom

<format>
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
</format>

</output>
