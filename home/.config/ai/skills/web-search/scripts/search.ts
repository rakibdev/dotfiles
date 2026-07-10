import { search } from './api.ts'

const args = process.argv.slice(2)
const query = args[0] || ''

let offset = 0
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--offset') offset = parseInt(args[i + 1] || '0', 10)
}

console.log(await search(query, 20, offset))
