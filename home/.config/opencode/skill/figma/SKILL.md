---
name: figma
description: Tool for fetching Figma design data and downloading images.
---

## Environment

- `FIGMA_ACCESS_TOKEN` - Personal access token from Figma settings

## Usage

### Get Node Data

```bash
bun .opencode/skill/figma/scripts/get-node.ts "<figmaUrl>" [depth]
bun .opencode/skill/figma/scripts/get-node.ts "<fileKey>" [nodeId] [depth]
```

**Examples**

```bash
# Get node from URL (preferred)
bun .opencode/skill/figma/scripts/get-node.ts "https://www.figma.com/design/abc123/MyFile?node-id=825-17286"

# Limit depth for overview
bun .opencode/skill/figma/scripts/get-node.ts "https://www.figma.com/design/abc123/MyFile?node-id=825-17286" 2

# Get entire file (no node-id in URL)
bun .opencode/skill/figma/scripts/get-node.ts "https://www.figma.com/design/abc123/MyFile" 2

# Raw args (fileKey + nodeId)
bun .opencode/skill/figma/scripts/get-node.ts "abc123" "825-17286" 3
```

### Download Image

```bash
bun .opencode/skill/figma/scripts/download-image.ts "<figmaUrl>" "<outputPath>" [format] [scale]
bun .opencode/skill/figma/scripts/download-image.ts "<fileKey>" "<nodeId>" "<outputPath>" [format] [scale]
```

**Examples**

```bash
# Download from URL (preferred)
bun .opencode/skill/figma/scripts/download-image.ts "https://www.figma.com/design/abc123/MyFile?node-id=825-17286" "./assets/card.png"

# Download as SVG
bun .opencode/skill/figma/scripts/download-image.ts "https://www.figma.com/design/abc123/MyFile?node-id=100-200" "./assets/icon.svg" svg

# PNG at 3x scale
bun .opencode/skill/figma/scripts/download-image.ts "https://www.figma.com/design/abc123/MyFile?node-id=100-200" "./assets/hero.png" png 3
```

## Tips

- Use depth 1-2 for initial exploration to understand file structure
- Default depth: unlimited (fetches all nested children)
- File data cached in `~/.cache/figma/` for 3 days to avoid rate limits
- Use `IMAGE-SVG` type nodes for icons/vectors, download as SVG
- For photos/complex images, download as PNG at 2x scale (default)
