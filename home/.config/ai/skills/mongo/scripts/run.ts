import { ObjectId } from 'mongodb'
import { connect, print } from './lib'

const source = process.argv[2] ?? (await Bun.stdin.text())

const { client, db } = await connect()
try {
  const fn = new Function('db', 'ObjectId', `return (async () => { ${source} })()`)
  print(await fn(db, ObjectId))
} finally {
  await client.close()
}
