---
name: explore-repo
description: Read/grep in github repo. Use this over git clone
trigger: github\.com/[\w.-]+/[\w.-]+
---

1. Read file tree `bun scripts/tree.ts <github_url>`. Depth is upto 3 level; tree.ts on subdir URL to go deeper
2. Grep `bun scripts/grep.ts <github_url> <regex> [more_subdir_urls]`. Include subdir URL to scope; extra subdir URLs are fetched in one batch. Only the grepped dirs are downloaded, cached in /tmp/github
3. webfetch/curl raw URLs to read individual file

Banned commands: git clone, git grep, git -C

## Output
- File tree + inline summary per file
- Explain internal architecture with execution steps, input + output data examples. Quote magic lines from code
- Explicit reference: "UserHandler in handlers/user.go" not "the handler"
