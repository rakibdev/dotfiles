---
name: github
description: Fetch GitHub URLs, repos, issues, pull requests, code search
pattern: github\.com/[\w-]+/[\w-]+
---

# Browse

URL contains `blob` (file), `tree` (dir), `issues/...` or `pull/...`.

```bash
bun scripts/fetch.ts <github_url>
```

# Code Search

```bash
bun scripts/grep.ts <query> [--page N]
bun scripts/grep.ts 'useQuery filename:\*.tsx' # global
bun scripts/grep.ts 'useQuery repo:opencode-ai/opencode' # single repo
```

- Use combination of import name, and `lang:tsx` and `path:` if unique (e.g. config files).
- Always use substrings to match wide results (e.g. `components/ui`, `tiptap` matches two lib imports)

# Search Repos

```bash
bun scripts/search-repos.ts <query> [--page N] [--stars N] [--sort updated|best-match]
bun scripts/search-repos.ts 'topic:neovim' --stars 1000 --sort best-match
```

- Default is `stars:100` (minimum) and sorted by `updated` to find underrated repos.

# Guide: Finding Projects

1. Build keyword combo: Use 2-3 distinct substrings that would appear in the code e.g. to find opencode plugins that edit files, search for `opencode` + `edit` + `file`. Don't use overly specific terms like `opencode-plugin` since authors may not use that exact phrase. Use lang filter e.g. `lang:tsx`.

2. Search and paginate at least 5 pages:

```bash
bun scripts/grep.ts 'opencode edit file lang:ts' --page 1
```

3. Spot clean, relevant results and read full file to understand implementation.

# Pull Request Operations

```bash
bun scripts/pr.ts <owner> <repo> <pr_number> <method> [...args]
bun scripts/pr.ts facebook react 35404 comment src/index.ts 10 15 'This block could be refactored'
```

<method>
- `diff` - Raw diff
- `files` - Changed files list
- `comment <path> <line> <body>` - Add comment on single line
- `comment <path> <start_line> <end_line> <body>` - Add comment on line range
- `reply <comment_id> <body>` - Reply to existing comment
</method>

- When reviewing a PR, first use `diff` to identify specific code blocks
- Make separate comments on specific lines instead of a single top-level review
