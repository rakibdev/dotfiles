---
name: explore-repo
description: Explore github repo to understand feature implementation
pattern: github\.com/[\w-]+/[\w-]+
---

- Read directory tree `bun scripts/tree.ts <github_url>`. Default depth limit is 3; use subdir URL like `https://github.com/user/repo/tree/branch/subdir` to explore deeper.
- Then webfetch/curl individual file raw URLs
- Banned commands: git clone, git grep, git -C

<output>
- Cite code, pseudo-code for representing complex logic and execution flow across files
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
