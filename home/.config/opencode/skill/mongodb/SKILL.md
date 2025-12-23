---
name: mongodb
description: Tool for querying or updating MongoDB.
---

## Usage

```bash
bun {base dir}/scripts/query.ts "<query>"
```

**Examples**

```bash
bun {base dir}/scripts/query.ts "db.collection('users').findOne()"
bun {base dir}/scripts/query.ts "db.collection('orders').countDocuments()"
```

## Tips

- Use `limit(1)` or `findOne()` to understand schema without wasting tokens.
- Use `countDocuments()` instead of fetching docs for existence checks.
