import { search } from './api.ts'

const args = process.argv.slice(2)
const query = args[0] || ''

let limit = 20
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--limit') limit = parseInt(args[i + 1] || '20', 10)
}

console.log(await search(query, limit))
