---
name: mongodb
description: Use for managing MongoDB.
---

## Usage

```bash
bun {dir}/scripts/query.ts "<query>"
```

**Examples**

```bash
# Simple read
bun {dir}/scripts/query.ts "db.collection('users').findOne()"

# Query with ObjectId
bun {dir}/scripts/query.ts "db.collection('users').findOne({ _id: new ObjectId('...') })"

# Multi-step update (Batching)
bun {dir}/scripts/query.ts "Promise.all([
  db.collection('rewards').deleteMany({ userId: new ObjectId('...') }),
  db.collection('users').updateOne({ _id: new ObjectId('...') }, { \$set: { 'dailyXp.count': 0 } })
])"
```

## Tips

- **Use query.ts over writing one-off scripts.** Use `Promise.all` for parallel operations or an IIFE `(async () => { ... })()` for complex multi-step logic.
- `ObjectId` is globally available in the query context.
- Use `limit(1)` or `findOne()` to understand schema without wasting tokens.
- Use `countDocuments()` instead of fetching docs for existence checks.
