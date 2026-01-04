---
description: Generate AGENTS.md for AI context
agent: build
---

# Initialize AGENTS.md

Analyze the workspace and generate an ultra-concise `AGENTS.md` to bootstrap AI context.

## Intelligence Gathering

1.  **Manifests**: Probe for `package.json` (JS/TS), `Cargo.toml` (Rust), `go.mod` (Go), `CMakeLists.txt` (C++), `pyproject.toml` (Python), etc. Peek at dependencies and scripts.
2.  **Git Topology**: Check `git rev-parse --show-toplevel`.
    - Detect if this is a monorepo.
    - Identify if subfolders are independent git repos or submodules.
3.  **Core Discovery**: Locate the "brain" and "identity" of the project to ensure maximum reuse and consistency.
    - Entry points: `main.*`, `index.*`, `app.module.ts`, `server.ts`, etc.
    - Identity: Typography, design tokens, or global stylesheets (e.g. `typography.ts`, `theme.ts`, `tailwind.config.js`, breakpoints).
    - Reuse: Identify "central hubs" (files with high usage/many imports). Use `rg --count-matches "from '.*'"` or similar to find heavy aggregators, or `rg` for specific file names to see how many others import them.
4.  **Dev Environment**:
    - Inline `tsconfig.json` / `jsconfig.json` path aliases.
    - Extract ONLY mission-critical scripts (`dev`, `build`, `test`). Ignore fluff.
    - Note if a `scripts/` folder exists for custom tooling.
    - Check for `.env.example` to see required vars.
    - Look for DB schemas (e.g. `schema.prisma`, `drizzle/`, `migrations/`).

## Output Format (AGENTS.md)

Keep it brutally short. Use bullet points. No fluff.

- **# [Project Name]**: Brief tech stack (e.g. "Next.js + Rust Monorepo").
- **## Structure**:
  - Git context (e.g. "Subfolders are individual git repos").
  - Core entry points and their roles.
- **## Tech**: Top 3-5 critical libs/frameworks.
- **## Commands**: High-frequency scripts only.
- **## Config**: Path aliases, critical `.env` vars (keys only), and DB info (e.g. "Drizzle + Postgres").
- **## Rules**: (Optional) Project-specific constraints (e.g. "Use shadcn for UI", "Directly inline queryFn").

Optimize for token efficiency. NEVER include these instructions in the output.
