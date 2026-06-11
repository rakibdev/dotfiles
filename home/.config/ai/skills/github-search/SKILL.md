---
name: github-search
description: Search GitHub repositories
---

# Search Repos

```bash
bun scripts/search-repos.ts <query> [--page N] [--stars N] [--sort updated|best-match]
bun scripts/search-repos.ts 'topic:neovim' --stars 1000 --sort best-match
```

- Default is `stars:100` (minimum) and sorted by `updated` to find underrated repos.

# Guide: Finding Projects

1. Build keyword combo: Use 2-3 distinct substrings that would appear in code e.g. to find opencode plugins that edit files, search for `opencode` + `edit` + `file`. Don't use overly specific terms like `opencode-plugin` since authors may not use that exact phrase. Use lang filter e.g. `lang:tsx`.

2. Search repos:
```bash
bun scripts/search-repos.ts 'topic:neovim' --stars 1000
```
