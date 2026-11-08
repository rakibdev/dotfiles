import { connect, execute, print } from './shell'

const source = process.argv[2] ?? (await Bun.stdin.text())

const { client, db } = await connect()
try {
  print(await execute(source, db))
} finally {
  await client.close()
}
