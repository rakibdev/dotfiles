import { MongoClient } from 'mongodb'

const uri = process.env.MCP_MONGODB_URI
if (!uri) {
  console.error('Error: MCP_MONGODB_URI env not set')
  process.exit(1)
}

const query = process.argv[2]
if (!query) process.exit(1)

const client = new MongoClient(uri)

try {
  await client.connect()
  const result = await eval(`(async (db) => { return ${query} })(client.db())`)
  console.log(JSON.stringify(result?.toArray ? result.toArray() : result, null, 2))
} catch (error: any) {
  console.error('Error:', error.message)
  process.exit(1)
} finally {
  await client.close()
}
