import { MongoClient, ObjectId } from 'mongodb'

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
  const queryFn = new Function('db', 'ObjectId', `return ${query}`)
  const result = await queryFn(client.db(), ObjectId)
  const output = result && typeof result.toArray === 'function' ? await result.toArray() : result
  console.log(JSON.stringify(output, null, 2))
} catch (error: any) {
  console.error('Error:', error.message)
  process.exit(1)
} finally {
  await client.close()
}
