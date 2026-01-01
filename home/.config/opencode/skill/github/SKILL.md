---
name: github
description: Use for searching code/issues of single repo or globally. Comment/review PRs.
pattern: github\.com/[\w-]+/[\w-]+
---

### Browse Files

```bash
bun {base dir}/scripts/read.ts <github_url>
```

- Accepts `blob` (file) or `tree` (directory) URLs.

**Tips**

- Defaults to `stars:>100` and sorted by `updated` to find trending repos.
- `--stars 0` includes everything
- Narrow by language: `lang:ts`, `lang:go`, `lang:rust`

### Code Search

```bash
bun {base dir}/scripts/search-code.ts <query> [--page N]

# Global

bun {base dir}/scripts/search-code.ts 'useQuery filename:\*.tsx'

# Single repo

bun {base dir}/scripts/search-code.ts 'useQuery repo:opencode-ai/opencode'
```

bun {base dir}/scripts/search-code.ts 'tiptap components/ui lang:ts'

**Tips**

- Search `components/ui` (shadcn) + lib name to see real integrations
- Use `filename:config.ts` or `lang:tsx` to target specific files
- Add `repo:owner/name` to search within a specific repository

### Search Repos

```bash
bun {base dir}/scripts/search-repos.ts <query> [--page N] [--stars N] [--sort updated|best-match]

# Example
bun {base dir}/scripts/search-repos.ts 'topic:neovim' --stars 1000 --sort best-match
```

### Search Issues

```bash
bun {base dir}/scripts/search-issues.ts <query>
```

### Pull Request Operations

```bash
bun {base dir}/scripts/pr.ts <owner> <repo> <pr_number> [method] [...args]

bun {base dir}/scripts/pr.ts facebook react 35404 comment src/index.ts 10 15 'This block could be refactored'
```

Methods:

- `get` (default) - PR details
- `diff` - Raw diff
- `files` - Changed files list
- `comments` - List review comments with threads
- `comment <path> <line> <body>` - Add comment on single line
- `comment <path> <start_line> <end_line> <body>` - Add comment on line range
- `reply <comment_id> <body>` - Reply to existing comment

**Tips**

- When reviewing a PR, first use `diff` to identify specific code blocks
- Make separate comments on specific lines instead of a single top-level review
- Check existing `comments` to see if a point was already raised
