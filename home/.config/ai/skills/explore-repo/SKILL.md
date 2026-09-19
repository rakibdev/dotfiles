---
name: explore-repo
description: read/grep scripts to explore GitHub repo
trigger: auto
---

1. Read file tree `bun scripts/tree.ts <github_url>`. Depth is upto 3 level; tree.ts on subdir URL to go deeper
2. Grep `bun scripts/grep.ts <github_url> <regex> [limit=20]`. Include subdir URL to scope
3. webfetch/curl raw URLs to read individual file

Banned commands: git clone, git grep, git -C

## Output
- File tree + inline summary per file
- Explain internal architecture with execution steps, input + output data examples. Quote magic lines from code
- Explicit reference: "UserHandler in handlers/user.go" not "the handler"
