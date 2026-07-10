---
name: web-search
description: Search Google
---

```bash
bun scripts/search.ts "bun js" (default limit 20)
bun scripts/search.ts "bun js" --offset 20 # page 2
```

## Tips
- Use 3-5 distinct terms
- Include year, country, site name when applicable e.g.
    - `iem price in bd 2026` (bd checks product availability in Bangladesh, 2026 for latest in stock)
    - `hyprland dotfiles github` (github name for only github repos)
