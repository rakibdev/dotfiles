---
name: github
description: Can list/read files, fetch issues, search code in single repo or globally. Comment on PRs. Use this over `webfetch` for github URLs.
pattern: github\.com/[\w-]+/[\w-]+
---

# Browse

URL containing `blob`, `tree`, `issues/...` or `pull/...`

```bash
bun {base dir}/scripts/fetch.ts <github_url>
```

# Code Search

```bash
bun {base dir}/scripts/search-code.ts <query> [--page N]
bun {base dir}/scripts/search-code.ts 'useQuery filename:\*.tsx' # global
bun {base dir}/scripts/search-code.ts 'useQuery repo:opencode-ai/opencode' # single repo
```

- Use combination of import name, and `lang:tsx` and `path:` if unique (e.g. config files).
- Always use substrings to match wide results (e.g. `components/ui`, `tiptap` matches two lib imports)

# Search Repos

```bash
bun {base dir}/scripts/search-repos.ts <query> [--page N] [--stars N] [--sort updated|best-match]
bun {base dir}/scripts/search-repos.ts 'topic:neovim' --stars 1000 --sort best-match
```

- Use 1-2 generic terms (framework name) for wide results. Read at least 3 pages.
- Narrow by language: `lang:ts`
- Default is `stars:100` (minimum) and sorted by `updated` to find underrated repos.

# Search Issues

```bash
bun {base dir}/scripts/search-issues.ts <query>
```

# Pull Request Operations

```bash
bun {base dir}/scripts/pr.ts <owner> <repo> <pr_number> <method> [...args]
bun {base dir}/scripts/pr.ts facebook react 35404 comment src/index.ts 10 15 'This block could be refactored'
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
