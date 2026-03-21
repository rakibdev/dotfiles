---
name: mongodb
description: Script for read/write MongoDB
---

## Usage

```bash
bun -e "
import { MongoClient } from 'mongodb'
const client = new MongoClient(process.env.MCP_MONGODB_URI)
const db = client.db()
// your query here
console.log(await db.collection('users').find().limit(1).toArray())
await client.close()
"
```

- Import `ObjectId` from `mongodb` if needed.
- Use `bun -e` directly. Don't write scripts to files.
- `MCP_MONGODB_URI` is set in `.env` — bun loads it automatically.
