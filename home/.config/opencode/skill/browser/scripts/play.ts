import { existsSync } from 'node:fs'

const PORT = process.env.PLAYWRIGHT_PORT
if (!PORT) {
  console.error('PLAYWRIGHT_PORT not set')
  process.exit(1)
}

const SOCK = '/tmp/browser.sock'
const DAEMON_SCRIPT = new URL('./daemon.ts', import.meta.url).pathname

const startDaemon = async () => {
  Bun.spawn({
    cmd: [process.execPath, DAEMON_SCRIPT],
    stdout: 'ignore',
    stderr: 'ignore',
    stdin: 'ignore',
    env: { ...process.env }
  }).unref()
  for (let i = 0; i < 60; i++) {
    if (existsSync(SOCK)) return
    await Bun.sleep(200)
  }
  throw new Error('Daemon failed to start')
}

const tryConnect = (argv: string[]): Promise<{ out?: string; error?: string }> =>
  new Promise((resolve, reject) => {
    let buf = ''
    Bun.connect({
      unix: SOCK,
      socket: {
        open(s) {
          s.write(JSON.stringify(argv) + '\n')
          s.flush()
        },
        data(_, d) {
          buf += d.toString()
          if (!buf.includes('\n')) return
          try {
            resolve(JSON.parse(buf.trim()))
          } catch {
            reject(new Error(`Bad response: ${buf}`))
          }
        },
        close() {
          if (buf)
            try {
              resolve(JSON.parse(buf.trim()))
            } catch {}
        },
        error(_, e) {
          reject(e)
        }
      }
    }).catch(reject)
  })

const send = async (argv: string[]): Promise<void> => {
  if (!existsSync(SOCK)) await startDaemon()
  let lastErr: Error | undefined
  for (let i = 0; i < 30; i++) {
    try {
      const { out, error } = await tryConnect(argv)
      if (error) {
        console.error(error)
        process.exit(1)
      }
      if (out) console.log(out)
      return
    } catch (e: any) {
      lastErr = e
      await Bun.sleep(100)
    }
  }
  console.error(lastErr?.message ?? 'Failed to connect to daemon')
  process.exit(1)
}

await send(process.argv.slice(2))
