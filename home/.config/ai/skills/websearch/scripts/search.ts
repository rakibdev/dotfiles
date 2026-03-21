import { search } from './api.ts'

const args = process.argv.slice(2)
const query = args[0] || ''
const offset = parseInt(args[1] || '0', 10)
console.log(await search(query, 20, offset))
