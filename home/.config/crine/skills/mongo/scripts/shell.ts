import { createRequire } from 'node:module'
import { MongoClient, ObjectId } from 'mongodb'

const require = createRequire(import.meta.url)

export const connect = async () => {
  const url = process.env.SKILL_MONGO_URL
  if (!url) throw new Error('env SKILL_MONGO_URL not set')
  const client = await MongoClient.connect(url)
  return { client, db: client.db() }
}

const IDENT = /^[A-Za-z_$][\w$]*$/

export const compact = (v: unknown): string | undefined => {
  if (v === undefined || typeof v === 'function' || typeof v === 'symbol') return undefined
  if (v === null) return 'null'
  if (typeof v === 'string') return JSON.stringify(v)
  if (typeof v === 'bigint') return v.toString()
  if (typeof v !== 'object') return String(v)
  if (v instanceof Date) return isNaN(+v) ? 'null' : v.toISOString()
  if (v instanceof ObjectId || '_bsontype' in v) return String(v)
  if (Array.isArray(v)) return `[${v.map((x) => compact(x) ?? 'null').join(', ')}]`
  const parts: string[] = []
  for (const [k, x] of Object.entries(v)) {
    const s = compact(x)
    if (s !== undefined) parts.push(`${IDENT.test(k) ? k : JSON.stringify(k)}: ${s}`)
  }
  return `{${parts.join(', ')}}`
}

export const print = (value: unknown) => {
  const out = compact(value)
  if (out !== undefined) console.log(out)
}

// direct eval: snippet sees module scope (db, ObjectId, require)
export const execute = (source: string, db?: unknown) => {
  void [require, ObjectId, db]
  return eval(`(async () => { ${source} })()`)
}
