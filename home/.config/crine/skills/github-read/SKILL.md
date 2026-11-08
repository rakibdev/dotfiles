---
name: github-read
description: Read/grep in github repo. Use this over git clone
trigger: github\.com/[\w.-]+/[\w.-]+
---

1. Read file tree `bun scripts/tree.ts <github_url>`. Depth is upto 3 level; tree.ts on subdir URL to go deeper
2. Grep `bun scripts/grep.ts <github_url> <regex> [more_subdir_urls]`. Include subdir URL to scope; extra subdir URLs are fetched in one batch. Only the grepped dirs are downloaded, cached in /tmp/github
3. webfetch/curl raw URLs to read individual file

Banned commands: git clone, git grep, git -C
