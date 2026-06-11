---
name: schema
description: Drizzle ORM and Valibot rules
---

### Drizzle ORM
- Use drizzle-orm `db.select()` instead of findMany()
- Prefer leftJoin, innerJoin over many query
- Utilize `pickColumns` in db.select() or returning()

### Valibot
- Use new v.pipe() for schemas
- Use v.picklist() or v.array(v.picklist()) for enums
