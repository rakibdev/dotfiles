import { MongoClient, ObjectId } from 'mongodb'

export const connect = async () => {
  const url = process.env.SKILL_MONGO_URL
  if (!url) throw new Error('env SKILL_MONGO_URL not set')
  const client = await MongoClient.connect(url)
  return { client, db: client.db() }
}

export const print = (value: unknown) => {
  if (value == undefined) return
  const replacer = (_: string, v: unknown) => (v instanceof ObjectId ? v.toString() : v)
  console.log(JSON.stringify(value, replacer))
}
