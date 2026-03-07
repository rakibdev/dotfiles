---
name: database
description: Run SQL queries on connected database.
pattern: \bdb\b
---

## Usage

Scripts has database already connected. Run SQL queries directly:

```bash
bun scripts/query.ts "<query>"

# Parameters
bun scripts/query.ts "sql\`SELECT * FROM users WHERE active = ${true}\`"

# Batching
bun scripts/query.ts "Promise.all([
  sql\`...\`,
  sql\`...`
])"
```

## Tips

- `sql` tag is globally available in query context.
- Use `LIMIT 1` to understand schema or check existence. Don't waste ai tokens.
- Bun.SQL automatically uses prepared statements for parameterized queries.
- For bulk inserts, use `sql\`INSERT INTO table ${sql(arrayOfObjects)}\``.
