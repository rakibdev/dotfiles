---
name: mongo
---

- Assume `process.env.SKILL_MONGO_URL` is loaded. Only override `SKILL_MONGO_URL` if user pastes url to you:
```bash
SKILL_MONGO_URL=... bun scripts/run.ts ..."
```

## Run JS
- Returns compact JSON
- `db`, `ObjectId` are global vars
- No heredoc needed for multiline, just '' quote

```bash
bun scripts/run.ts '
const user = await db.collection("users").findOne({ email: "x@y.com" })
return db.collection("orders").find({ userId: user._id }).toArray()
'
```

- Supports stdin too: `bun scripts/run.ts < script.js`

## Token-saving tips
- Unknown shape? Use `findOne` not `find().toArray()`
- Use projections when need few fields
- `.limit()` to lowest count possible

## Notes
- Be careful, don't modify db
- Use `ObjectId` (not string) to query id fields
