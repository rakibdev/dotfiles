import { sql } from 'bun'

const query = process.argv[2]

try {
  const queryFn = new Function('sql', `return ${query}`)
  const result = await queryFn(sql)

  console.log(JSON.stringify(result, null, 2))
} catch (error: any) {
  console.error(error.message)
  if (error.stack) console.error(error.stack)
  process.exit(1)
}
