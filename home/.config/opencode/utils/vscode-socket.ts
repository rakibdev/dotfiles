import { readdir } from 'node:fs/promises'

const SOCK_PREFIX = 'vscode-ai-'
const SOCK_SUFFIX = '.sock'
const DEFAULT_TIMEOUT = 5000
const CACHE_TTL = 5000

type SocketInfo = { socket: string; path: string; name: string }
let cache: { sockets: SocketInfo[]; ts: number } | null = null

export type Window = {
  path: string
  name: string
  rpc: <T>(method: string, params?: Record<string, unknown>) => Promise<T>
}

const connect = <T>(
  socket: string,
  method: string,
  params?: Record<string, unknown>,
  timeout = DEFAULT_TIMEOUT
): Promise<T> => {
  const id = crypto.randomUUID()
  const request = JSON.stringify({ id, method, params }) + '\n'

  return new Promise((resolve, reject) => {
    let buffer = ''
    let settled = false
    let conn: Awaited<ReturnType<typeof Bun.connect>> | null = null

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        conn?.end()
        reject(new Error('timeout'))
      }
    }, timeout)

    const done = (fn: () => void) => {
      if (settled) return
      clearTimeout(timer)
      settled = true
      conn?.end()
      fn()
    }

    Bun.connect({
      unix: socket,
      socket: {
        open(s) {
          conn = s
          s.write(request)
        },
        data(_, data) {
          buffer += data.toString()
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const res = JSON.parse(line) as { id: string; result?: T; error?: { message: string } }
              if (res.id == id)
                done(() => (res.error ? reject(new Error(res.error.message)) : resolve(res.result as T)))
            } catch {}
          }
        },
        error(_, e) {
          done(() => reject(e))
        },
        close() {
          done(() => reject(new Error('closed')))
        },
        connectError(_, e) {
          done(() => reject(e))
        }
      }
    }).catch(e => done(() => reject(e)))
  })
}

const discover = async (): Promise<SocketInfo[]> => {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.sockets

  // todo: Bun Glob returns empty.
  let files: string[] = []
  try {
    const dir = await readdir('/tmp')
    files = dir.filter(f => f.startsWith(SOCK_PREFIX) && f.endsWith(SOCK_SUFFIX))
  } catch {
    return []
  }

  const results = await Promise.all(
    files.map(async file => {
      const socket = `/tmp/${file}`
      try {
        const info = await connect<{ path: string; name: string }>(socket, 'workspace/info', undefined, 500)
        return { socket, ...info }
      } catch {
        return null
      }
    })
  )
  const sockets = results.filter(r => r != null)
  cache = { sockets, ts: Date.now() }
  return sockets
}

export const vscode = {
  async windows(): Promise<Window[]> {
    const sockets = await discover()
    return sockets.map(s => ({
      path: s.path,
      name: s.name,
      rpc: <T>(method: string, params?: Record<string, unknown>) => connect<T>(s.socket, method, params)
    }))
  },

  async find(match: (w: Window) => boolean): Promise<Window | null> {
    const windows = await this.windows()
    return windows.find(match) ?? null
  },

  async all<T>(method: string, params?: Record<string, unknown>): Promise<{ window: Window; result: T }[]> {
    const windows = await this.windows()
    const results = await Promise.all(
      windows.map(async w => {
        try {
          return { window: w, result: await w.rpc<T>(method, params) }
        } catch {
          return null
        }
      })
    )
    return results.filter(r => r != null)
  },

  async first<T>(method: string, params?: Record<string, unknown>): Promise<T | null> {
    const windows = await this.windows()
    for (const w of windows) {
      try {
        return await w.rpc<T>(method, params)
      } catch {}
    }
    return null
  }
}
