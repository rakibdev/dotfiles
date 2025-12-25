---
name: github
description: Can browse code/issues of specific repo URL or search globally on github and comment on PRs.
pattern: github\.com/[\w-]+/[\w-]+
---

## Usage

### Browse Single Repo

Use `webfetch` tool with GitChamber API to list, read, search code.

**API_URL**: `https://gitchamber.com/repos/{owner}/{repo}/{branch}/`

- **List**: `GET {API_URL}/files?glob=**/*.ts` (omit glob for all files)
- **Read**: `GET {API_URL}/files/{path}?start=1&end=50&showLineNumbers=true`
- **Search**: `GET {API_URL}/search/{query}?glob=**/*.ts`

**Example**: `https://gitchamber.com/repos/facebook/react/main/files/README.md?start=10&end=50`

### Global Repo Search

```bash
bun {base dir}/scripts/search-repos.ts <query>
```

**Examples**

```bash
bun {base dir}/scripts/search-repos.ts 'lang:ts stars:>100 mcp'
bun {base dir}/scripts/search-repos.ts 'topic:neovim lang:lua'
```

**Tips**

- Narrow by language: `lang:ts`, `lang:go`
- Filter by stars: `stars:>100`, `stars:50..200`
- Sorted by latest updates (default) to find active projects
- Use short, unique terms for better results

### Global Code Search

```bash
bun {base dir}/scripts/search-code.ts <query>
```

**Examples**

```bash
bun {base dir}/scripts/search-code.ts 'opencode-ai/plugin lang:ts'
bun {base dir}/scripts/search-code.ts 'useQuery filename:*.tsx'
```

**Tips**

- Use unique package names/imports to discover underrated repos
- Filter by language: `lang:ts`
- Use `filename:*.tsx` to target specific file types
- Search error messages to find solutions

### Search Issues/PRs

```bash
bun {base dir}/scripts/search-issues.ts <issue|pr> <query>
```

**Examples**

```bash
bun {base dir}/scripts/search-issues.ts issue 'repo:facebook/react state:open'
bun {base dir}/scripts/search-issues.ts pr 'repo:vercel/next.js is:merged author:leerob'
```

### List Repository Issues

```bash
bun {base dir}/scripts/list-issues.ts <owner> <repo> [state]
```

State: `open` (default), `closed`, `all`

**Examples**

```bash
bun {base dir}/scripts/list-issues.ts facebook react
bun {base dir}/scripts/list-issues.ts vercel next.js closed
```

### Pull Request Operations

```bash
bun {base dir}/scripts/pr.ts <owner> <repo> <pr_number> [method] [...args]
```

Methods:

- `get` (default) - PR details
- `diff` - Raw diff
- `files` - Changed files list
- `comments` - List review comments with threads
- `comment <path> <line> <body>` - Add comment on single line
- `comment <path> <start_line> <end_line> <body>` - Add comment on line range
- `reply <comment_id> <body>` - Reply to existing comment

**Examples**

```bash
bun {base dir}/scripts/pr.ts facebook react 35404
bun {base dir}/scripts/pr.ts facebook react 35404 diff
bun {base dir}/scripts/pr.ts facebook react 35404 files
bun {base dir}/scripts/pr.ts facebook react 35404 comments
bun {base dir}/scripts/pr.ts facebook react 35404 comment src/index.ts 42 'Consider using a constant here'
bun {base dir}/scripts/pr.ts facebook react 35404 comment src/index.ts 10 15 'This block could be refactored'
```

**Tips**

- When asked to review a PR, first use `diff` to identify specific code blocks.
- Provide feedback by making separate comments on specific lines or ranges instead of a single top-level review.
- Check existing `comments` to see if a point was already raised or to respond to existing threads.
