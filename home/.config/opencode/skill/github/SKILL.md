---
name: github
description: Tool for querying or updating GitHub.
---

## Environment

- `GITHUB_PAT` - Personal access token with `repo` scope

## Usage

### Search Repositories

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

### Search Code

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
- `comments` - Review comments
- `reviews` - List all reviews
- `review <event> [body]` - Submit review (APPROVE, REQUEST_CHANGES, COMMENT)

**Examples**

```bash
bun {base dir}/scripts/pr.ts facebook react 35404
bun {base dir}/scripts/pr.ts facebook react 35404 diff
bun {base dir}/scripts/pr.ts facebook react 35404 files
bun {base dir}/scripts/pr.ts facebook react 35404 reviews
bun {base dir}/scripts/pr.ts facebook react 35404 review APPROVE 'LGTM!'
bun {base dir}/scripts/pr.ts facebook react 35404 review COMMENT 'Nice refactor'
```
