---
name: github-manage
description: View and comment on GitHub issues and pull requests
pattern: github\.com/[\w-]+/[\w-]+/(pull|issues)/\d+
---

# Pull Request & Issue Operations

```bash
bun scripts/fetch.ts <github_url>
bun scripts/pr.ts <owner> <repo> <pr_number> <method> [...args]
```

<method>
- `diff` - Raw diff
- `files` - Changed files list
- `comment <path> <line> <body>` - Add comment on single line
- `comment <path> <start_line> <end_line> <body>` - Add comment on line range
- `reply <comment_id> <body>` - Reply to existing comment
</method>

- When reviewing PR, first use `diff` to find specific code blocks
- Make separate comments on specific lines instead of single top-level review
