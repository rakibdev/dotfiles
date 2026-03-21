---
name: database
description: Run queries on SQL database
---

## Usage

```bash
bun -e "
import { SQL } from 'bun'
const sql = new SQL(process.env.DATABASE_URL)
console.log(await sql\`SELECT * FROM users LIMIT 1\`)
await sql.close()
"
```

- Use `LIMIT 1` to inspect schema without wasting tokens.
